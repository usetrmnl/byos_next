import yaml from "js-yaml";
import {
	type Context,
	type Emitter,
	Liquid,
	type Parser,
	Tag,
	type TagToken,
	type Template,
	type TopLevelToken,
} from "liquidjs";
import { db } from "@/lib/database/db";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { logger, type RecipeParamDefinitions } from "./recipe-renderer";

const TRMNL_CSS_URL = "https://trmnl.com/css/latest/plugins.css";
const TRMNL_JS_URL = "https://trmnl.com/js/latest/plugins.js";

export type CustomField = {
	keyname?: string;
	name?: string;
	field_type?: string;
	default?: unknown;
	description?: string;
	[key: string]: unknown;
};

export type SettingsYml = {
	polling_url?: string;
	custom_fields?: CustomField[];
	[key: string]: unknown;
};

type LiquidRenderResult = {
	html: string;
	settings: SettingsYml;
};

/**
 * Custom liquidjs block tag for TRMNL's {% template name %}...{% endtemplate %}.
 * Simply renders its body content — the tag is organizational in TRMNL.
 */
class TemplateTag extends Tag {
	private templates: Template[] = [];

	constructor(
		token: TagToken,
		remainTokens: TopLevelToken[],
		liquid: Liquid,
		parser: Parser,
	) {
		super(token, remainTokens, liquid);
		const stream = parser
			.parseStream(remainTokens)
			.on("tag:endtemplate", () => {
				stream.stop();
			})
			.on("template", (tpl: Template) => {
				this.templates.push(tpl);
			})
			.on("end", () => {
				throw new Error("{% template %} block missing {% endtemplate %}");
			});
		stream.start();
	}

	*render(ctx: Context, emitter: Emitter): Generator<unknown> {
		for (const tpl of this.templates) {
			yield this.liquid.renderer.renderTemplates([tpl], ctx, emitter);
		}
	}
}

/**
 * Fetch recipe files from the database for a given recipe slug.
 * Returns a map of filename -> content.
 */
async function fetchRecipeFiles(
	slug: string,
	userId?: string,
): Promise<Map<string, string> | null> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		logger.warn("Database not ready, cannot fetch liquid recipe files");
		return null;
	}

	const runQuery = (conn: typeof db) =>
		conn
			.selectFrom("recipe_files")
			.innerJoin("recipes", "recipes.id", "recipe_files.recipe_id")
			.select(["recipe_files.filename", "recipe_files.content"])
			.where("recipes.slug", "=", slug)
			.where("recipes.type", "=", "liquid")
			.execute();

	const files = userId
		? await withExplicitUserScope(userId, runQuery)
		: await runQuery(db);

	if (!files || files.length === 0) {
		return null;
	}

	// Detect and strip GitHub archive root prefix (e.g. "repo-main/")
	// when all filenames share a common directory prefix
	const filenames = files.map((f) => f.filename);
	const firstSlash = filenames[0]?.indexOf("/") ?? -1;
	let stripPrefix = "";
	if (firstSlash > 0) {
		const candidate = filenames[0].slice(0, firstSlash + 1);
		if (filenames.every((f) => f.startsWith(candidate))) {
			stripPrefix = candidate;
		}
	}

	const fileMap = new Map<string, string>();
	for (const file of files) {
		const normalized = stripPrefix
			? file.filename.slice(stripPrefix.length)
			: file.filename;
		fileMap.set(normalized, file.content);
	}
	return fileMap;
}

/**
 * Parse settings.yml content to extract custom_fields defaults and polling_url.
 */
function parseSettings(settingsContent: string): SettingsYml {
	try {
		const parsed = yaml.load(settingsContent);
		if (parsed && typeof parsed === "object") {
			return parsed as SettingsYml;
		}
	} catch (error) {
		logger.error("Error parsing settings.yml:", error);
	}
	return {};
}

/**
 * Extract default values from custom_fields definition.
 * custom_fields is an array of { keyname, default, ... } objects.
 */
function extractCustomFieldDefaults(
	settings: SettingsYml,
): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};
	if (Array.isArray(settings.custom_fields)) {
		for (const field of settings.custom_fields) {
			if (field.keyname && field.default !== undefined) {
				defaults[field.keyname] = field.default;
			}
		}
	}
	return defaults;
}

/**
 * Fetch data from polling URL(s). Multiple URLs can be newline-separated.
 * Each URL's data is assigned to IDX_0, IDX_1, etc.
 */
async function fetchPollingData(
	pollingUrl: string,
): Promise<Record<string, unknown>> {
	const urls = pollingUrl
		.split(/[\r\n]+/)
		.map((u) => u.trim())
		.filter(Boolean);

	const data: Record<string, unknown> = {};

	const results = await Promise.allSettled(
		urls.map(async (url, index) => {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 10000);
			try {
				const response = await fetch(url, {
					signal: controller.signal,
					headers: { "User-Agent": "BYOS/1.0" },
				});
				if (!response.ok) {
					logger.warn(`Polling URL ${url} returned ${response.status}`);
					return { index, result: null };
				}
				const json = await response.json();
				return { index, result: json };
			} catch (error) {
				logger.error(`Error fetching polling URL ${url}:`, error);
				return { index, result: null };
			} finally {
				clearTimeout(timeout);
			}
		}),
	);

	for (const settled of results) {
		if (settled.status === "fulfilled" && settled.value.result !== null) {
			data[`IDX_${settled.value.index}`] = settled.value.result;
		}
	}

	return data;
}

/**
 * Wrap inline <script>...</script> content in {% raw %}...{% endraw %}
 * so liquidjs doesn't try to parse JS syntax (e.g. spread `...` as range `..`).
 * Only targets inline scripts (skips <script src="..."></script>).
 * Scripts that contain Liquid expressions ({{ }} or {% %}) are left unprotected
 * so that template variables are resolved by the Liquid engine.
 */
function wrapNonLiquidScripts(content: string): string {
	return content.replace(
		/(<script(?![^>]*\bsrc\s*=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
		(_, open, body, close) => {
			const hasLiquidExpressions =
				/\{\{[\s\S]*?\}\}/.test(body) || /\{%[\s\S]*?%\}/.test(body);
			if (hasLiquidExpressions) {
				return `${open}${body}${close}`;
			}
			return `${open}{% raw %}${body}{% endraw %}${close}`;
		},
	);
}

/**
 * Strip parentheses from Liquid conditionals ({% if %}, {% elsif %}, {% unless %}).
 * TRMNL's Ruby Liquid supports grouping with parens but liquidjs doesn't —
 * it misreads `(name` as the start of a range expression like `(1..5)`.
 * Liquid evaluates and/or left-to-right, so parens can be safely removed.
 */
function removeCosmeticParens(content: string): string {
	return content.replace(
		/\{%[-\s]*(if|elsif|unless)\s+([\s\S]*?)[-]?%\}/g,
		(match) => match.replace(/[()]/g, ""),
	);
}

/**
 * Find the main liquid template file from the recipe files map.
 * Looks for full.liquid at common paths.
 */
function findTemplateFile(
	files: Map<string, string>,
	name: string,
): string | null {
	const candidates = [
		`src/${name}`,
		name,
		`views/${name}`,
		`templates/${name}`,
	];
	for (const candidate of candidates) {
		const content = files.get(candidate);
		if (content !== undefined) {
			return content;
		}
	}
	for (const [filename, content] of files) {
		if (filename.endsWith(`/${name}`) || filename === name) {
			return content;
		}
	}
	return null;
}

/**
 * Fetch and return the parsed settings.yml for a liquid recipe.
 */
export async function fetchLiquidRecipeSettings(
	slug: string,
	userId?: string,
): Promise<SettingsYml | null> {
	const files = await fetchRecipeFiles(slug, userId);
	if (!files) return null;

	const settingsContent = findTemplateFile(files, "settings.yml");
	return settingsContent ? parseSettings(settingsContent) : null;
}

/**
 * Register custom filters matching TRMNL/Laravel's Liquid extensions.
 */
function registerCustomFilters(engine: Liquid): void {
	engine.registerFilter("l_date", (date: string, format?: string) => {
		try {
			const d = date ? new Date(date) : new Date();
			if (Number.isNaN(d.getTime())) return date;
			if (format === "%B %d, %Y") {
				return d.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			}
			if (format === "%m/%d/%Y") {
				return d.toLocaleDateString("en-US", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				});
			}
			return d.toLocaleDateString();
		} catch {
			return date;
		}
	});

	engine.registerFilter(
		"find_by",
		(arr: unknown[], key: string, value: unknown) => {
			if (!Array.isArray(arr)) return null;
			return (
				arr.find((item) => {
					if (item && typeof item === "object") {
						return (item as Record<string, unknown>)[key] === value;
					}
					return false;
				}) ?? null
			);
		},
	);

	engine.registerFilter("group_by", (arr: unknown[], key: string) => {
		if (!Array.isArray(arr)) return {};
		const groups: Record<string, unknown[]> = {};
		for (const item of arr) {
			const groupKey =
				item && typeof item === "object"
					? String((item as Record<string, unknown>)[key] ?? "")
					: "";
			if (!groups[groupKey]) groups[groupKey] = [];
			groups[groupKey].push(item);
		}
		return groups;
	});

	engine.registerFilter(
		"pluralize",
		(count: number, singular: string, plural: string) => {
			return count === 1 ? singular : plural;
		},
	);
}

/**
 * Render a liquid recipe by slug.
 *
 * 1. Fetches recipe files from DB
 * 2. Parses settings.yml for custom_fields defaults and polling_url
 * 3. Fetches data from polling URL(s)
 * 4. Renders full.liquid with liquidjs, registering shared.liquid as a partial
 * 5. Returns rendered HTML
 *
 * @param customFieldOverrides - optional overrides merged over custom_field defaults
 */
export async function renderLiquidRecipe(
	slug: string,
	customFieldOverrides?: Record<string, unknown>,
	userId?: string,
): Promise<LiquidRenderResult | null> {
	const files = await fetchRecipeFiles(slug, userId);
	if (!files) {
		logger.warn(`No liquid recipe files found for slug: ${slug}`);
		return null;
	}

	// Parse settings
	const settingsContent = findTemplateFile(files, "settings.yml");
	const settings = settingsContent ? parseSettings(settingsContent) : {};

	// Build custom fields values from defaults, then apply overrides
	const customFieldValues = {
		...extractCustomFieldDefaults(settings),
		...customFieldOverrides,
	};

	// Resolve polling URL through Liquid so templates with {% for %} / {% assign %}
	// are expanded into actual URLs before fetching
	let pollingData: Record<string, unknown> = {};
	if (settings.polling_url) {
		try {
			const urlEngine = new Liquid({
				strictFilters: false,
				strictVariables: false,
			});
			const resolvedUrl = await urlEngine.parseAndRender(
				settings.polling_url,
				customFieldValues,
			);
			pollingData = await fetchPollingData(resolvedUrl);
		} catch (error) {
			logger.warn(`Error resolving polling URL template: `, error);
		}
	}

	// Find the main template
	let fullTemplate = findTemplateFile(files, "full.liquid");
	if (!fullTemplate) {
		logger.error(`No full.liquid template found for recipe: ${slug}`);
		return null;
	}

	// Build templates map for partials (all .liquid files except full.liquid)
	const templates: Record<string, string> = {};
	for (const [filename, content] of files) {
		if (filename.endsWith(".liquid") && !filename.endsWith("full.liquid")) {
			const baseName = filename
				.replace(/^src\//, "")
				.replace(/^views\//, "")
				.replace(/^templates\//, "")
				.replace(/\.liquid$/, "");
			templates[baseName] = content;
			templates[filename] = content;

			// Extract {% template name %}...{% endtemplate %} blocks as named partials
			// so they can be referenced via {% render 'name' %}
			const blockRegex =
				/\{%[-\s]*template\s+(\w+)\s*[-]?%\}([\s\S]*?)\{%[-\s]*endtemplate\s*[-]?%\}/g;
			let blockMatch = blockRegex.exec(content);
			while (blockMatch !== null) {
				templates[blockMatch[1]] = blockMatch[2].trim();
				blockMatch = blockRegex.exec(content);
			}
		}
	}
	const sharedTemplate = findTemplateFile(files, "shared.liquid");
	if (sharedTemplate) {
		templates.shared = sharedTemplate;
		fullTemplate = `${sharedTemplate}\n${fullTemplate}`;

		// Extract named template blocks from shared.liquid as partials
		const blockRegex =
			/\{%[-\s]*template\s+(\w+)\s*[-]?%\}([\s\S]*?)\{%[-\s]*endtemplate\s*[-]?%\}/g;
		let blockMatch = blockRegex.exec(sharedTemplate);
		while (blockMatch !== null) {
			templates[blockMatch[1]] = blockMatch[2].trim();
			blockMatch = blockRegex.exec(sharedTemplate);
		}
	}

	// Set up liquidjs engine with in-memory templates for partials
	const engine = new Liquid({
		strictFilters: false,
		strictVariables: false,
		templates,
	});

	// Register the custom {% template %}...{% endtemplate %} block tag
	engine.registerTag("template", TemplateTag);

	// Register custom filters
	registerCustomFilters(engine);

	// Build template context
	const context: Record<string, unknown> = {
		trmnl: {
			plugin_settings: {
				custom_fields_values: customFieldValues,
			},
			env: {
				firmware_version: "1.0.0",
				time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			user: {
				name: "BYOS User",
				locale: "en",
			},
		},
		...pollingData,
	};

	try {
		const prepared = removeCosmeticParens(wrapNonLiquidScripts(fullTemplate));
		const body = await engine.parseAndRender(prepared, context);
		const html = `
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="${TRMNL_CSS_URL}">
    <script src="${TRMNL_JS_URL}"></script>
  </head>
  <body class="environment trmnl">
    <div class="screen">
		<div class="view view--full">
		${body}
		</div>
	</div>
    </div>
  </body>
</html>`;
		return { html, settings };
	} catch (error) {
		logger.error(`Error rendering liquid template for ${slug}: `, error);
		return null;
	}
}

/**
 * Convert TRMNL custom_fields to RecipeParamDefinitions.
 */
export function customFieldsToParamDefinitions(
	fields: CustomField[],
): RecipeParamDefinitions {
	const definitions: RecipeParamDefinitions = {};
	for (const field of fields) {
		if (!field.keyname) continue;
		definitions[field.keyname] = {
			label: field.name ?? field.keyname,
			type: field.field_type === "number" ? "number" : "string",
			default: field.default,
			description: field.description,
		};
	}
	return definitions;
}

/**
 * Check if a recipe slug exists in the DB as a liquid recipe.
 */
export async function isLiquidRecipe(
	slug: string,
	userId?: string,
): Promise<boolean> {
	const { ready } = await checkDbConnection();
	if (!ready) return false;

	const runQuery = (conn: typeof db) =>
		conn
			.selectFrom("recipes")
			.select("id")
			.where("slug", "=", slug)
			.where("type", "=", "liquid")
			.executeTakeFirst();

	const recipe = userId
		? await withExplicitUserScope(userId, runQuery)
		: await runQuery(db);

	return !!recipe;
}
