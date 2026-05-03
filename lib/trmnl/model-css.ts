/**
 * TRMNL `model.css` helpers.
 *
 * Each TRMNL panel model in the registry can declare:
 *   - `css.classes` — framework selectors that scope styling to that model
 *     (e.g. `screen--seeed_e1002`, `screen--md`, `screen--density-2x`).
 *   - `css.variables` — CSS custom properties consumed by plugin layouts
 *     (`--screen-w`, `--screen-h`, `--pixel-ratio`, `--dither-pixel-size`, …).
 *
 * Plugin authors and Liquid markup target these directly. To keep the React
 * preview, the server-side bitmap rasterizer, and the on-device firmware
 * visually consistent, we apply both wherever a recipe HTML/JSX tree is
 * produced.
 */

import type { CSSProperties } from "react";
import type { TrmnlModel } from "@/lib/trmnl/types";

type CssVarEntry = [string, string];

/** Normalise the two upstream serialisations of css.variables. */
function normalizeCssVariables(raw: unknown): CssVarEntry[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw.flatMap((entry): CssVarEntry[] =>
			Array.isArray(entry) &&
			entry.length === 2 &&
			typeof entry[0] === "string" &&
			typeof entry[1] === "string"
				? [[entry[0], entry[1]]]
				: [],
		);
	}
	if (typeof raw === "object") {
		return Object.entries(raw as Record<string, unknown>).flatMap(
			([key, value]): CssVarEntry[] =>
				typeof value === "string" ? [[key, value]] : [],
		);
	}
	return [];
}

export function getTrmnlModelClassName(
	model: TrmnlModel | null | undefined,
): string {
	const classes = model?.css?.classes;
	if (!classes) return "";
	return Object.values(classes as Record<string, unknown>)
		.filter(
			(value): value is string => typeof value === "string" && value !== "",
		)
		.join(" ");
}

export function getTrmnlModelStyle(
	model: TrmnlModel | null | undefined,
): CSSProperties | undefined {
	const entries = normalizeCssVariables(model?.css?.variables);
	if (entries.length === 0) return undefined;
	const style: Record<string, string> = {};
	for (const [name, value] of entries) {
		style[name] = value;
	}
	return style as CSSProperties;
}

/**
 * Conservative escape for embedding a CSS-variable value inside a server-side
 * `<style>` tag. Prevents newline-driven layout breakage and `</style>`
 * breakouts even though values come from a JSON registry today.
 */
function escapeCssValue(value: string): string {
	return value.replace(/[\n\r]/g, " ").replace(/<\//g, "<\\/");
}

/**
 * Build a `<style>` tag and body className for embedding into a complete HTML
 * document (Liquid markup path).
 */
export function buildTrmnlCssInjection(model: TrmnlModel | null | undefined): {
	styleTag: string;
	bodyClassName: string;
} {
	const bodyClassName = getTrmnlModelClassName(model);
	const entries = normalizeCssVariables(model?.css?.variables);
	const varsBlock = entries.length
		? `:root{${entries
				.map(([name, value]) => `${name}:${escapeCssValue(value)};`)
				.join("")}}`
		: "";
	return {
		styleTag: varsBlock ? `<style data-trmnl-model>${varsBlock}</style>` : "",
		bodyClassName,
	};
}

/** Inject `<style>` and the body className into a full HTML document. */
export function injectTrmnlCssIntoHtml(
	html: string,
	model: TrmnlModel | null | undefined,
): string {
	const { styleTag, bodyClassName } = buildTrmnlCssInjection(model);
	if (!styleTag && !bodyClassName) return html;

	let result = html;
	if (styleTag) {
		result = /<\/head>/i.test(result)
			? result.replace(/<\/head>/i, `${styleTag}</head>`)
			: `${styleTag}${result}`;
	}
	if (bodyClassName) {
		const bodyOpenRe = /<body([^>]*)>/i;
		if (bodyOpenRe.test(result)) {
			result = result.replace(bodyOpenRe, (_match, attrs: string) => {
				const classRe = /class="([^"]*)"/i;
				const existing = classRe.exec(attrs);
				if (existing) {
					const merged = `${existing[1]} ${bodyClassName}`.trim();
					return `<body${attrs.replace(classRe, `class="${merged}"`)}>`;
				}
				return `<body${attrs} class="${bodyClassName}">`;
			});
		} else {
			result = `<body class="${bodyClassName}">${result}</body>`;
		}
	}
	return result;
}
