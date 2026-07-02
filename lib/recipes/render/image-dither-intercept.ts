import type { Page } from "puppeteer-core";
import React from "react";
import { prepareImageForDevice } from "@/lib/render/device-image-prep";
import { toPhysicalImageDimensions } from "@/lib/render/image-display-dimensions";
import { logger } from "../logger";
import type { ImageDitherPolicy } from "./image-dither-policy";

type ImageProps = {
	children?: React.ReactNode;
	height?: unknown;
	src?: unknown;
	srcSet?: unknown;
	style?: React.CSSProperties;
	width?: unknown;
	[key: string]: unknown;
};

type PreparedImageEntry = {
	id: string;
	src: string;
	width?: number;
	height?: number;
};

type FunctionComponent = (props: Record<string, unknown>) => React.ReactNode;

const RAW_BASE64_IMAGE_PREFIX = /^(?:iVBORw0KGgo|\/9j\/|R0lGOD)/;

function isSkippableImageSrc(src: string): boolean {
	const trimmed = src.trim();
	return (
		trimmed.length === 0 ||
		trimmed.startsWith("data:") ||
		trimmed.startsWith("blob:") ||
		trimmed.startsWith("#") ||
		RAW_BASE64_IMAGE_PREFIX.test(trimmed)
	);
}

function numericDimension(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return value;
	}
	if (typeof value !== "string") return undefined;
	const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/);
	return match ? Number.parseFloat(match[1]) : undefined;
}

function getImageDimensions(props: ImageProps): {
	width?: number;
	height?: number;
} {
	return {
		width:
			numericDimension(props.width) ?? numericDimension(props.style?.width),
		height:
			numericDimension(props.height) ?? numericDimension(props.style?.height),
	};
}

async function prepareSrc({
	src,
	policy,
	width,
	height,
	cache,
}: {
	src: string;
	policy: ImageDitherPolicy;
	width?: number;
	height?: number;
	cache: Map<string, Promise<string>>;
}): Promise<string> {
	if (policy.mode === "off" || isSkippableImageSrc(src)) return src;

	// `width`/`height` are logical layout px (the space the `<img>` was
	// authored in); dither at the physical screen size the recipe is
	// eventually composited to, or the pattern gets resampled away.
	const physical = toPhysicalImageDimensions(width, height, policy.pixelRatio);
	const key = `${src}|${physical.width ?? ""}|${physical.height ?? ""}|${policy.method}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const prepared = prepareImageForDevice({
		src,
		profile: policy.profile,
		width: physical.width,
		height: physical.height,
		method: policy.method,
	})
		.then((image) => image.dataUrl)
		.catch((error) => {
			logger.warn(`Failed to prepare image for device: ${src}`, error);
			return src;
		});
	cache.set(key, prepared);
	return prepared;
}

async function rewriteSrcSet({
	srcSet,
	policy,
	width,
	height,
	cache,
}: {
	srcSet: string;
	policy: ImageDitherPolicy;
	width?: number;
	height?: number;
	cache: Map<string, Promise<string>>;
}): Promise<string> {
	const trimmed = srcSet.trim();
	// Data URLs contain a comma before the payload; naive splitting breaks them.
	if (trimmed.startsWith("data:") || isSkippableImageSrc(trimmed)) {
		return srcSet;
	}

	const candidates = srcSet
		.split(",")
		.map((candidate) => candidate.trim())
		.filter(Boolean);
	const rewritten = await Promise.all(
		candidates.map(async (candidate) => {
			const [src, ...descriptors] = candidate.split(/\s+/);
			if (!src) return candidate;
			const nextSrc = await prepareSrc({ src, policy, width, height, cache });
			return [nextSrc, ...descriptors].join(" ");
		}),
	);
	return rewritten.join(", ");
}

function isClassComponent(type: unknown): boolean {
	return Boolean(
		typeof type === "function" &&
			(type as { prototype?: { render?: unknown } }).prototype?.render,
	);
}

async function rewriteNode(
	node: React.ReactNode,
	policy: ImageDitherPolicy,
	cache: Map<string, Promise<string>>,
): Promise<React.ReactNode> {
	if (!React.isValidElement(node)) return node;

	const props = node.props as ImageProps;
	const type = node.type;

	if (typeof type === "function" && !isClassComponent(type)) {
		const rendered = await Promise.resolve(
			(type as FunctionComponent)(props as Record<string, unknown>),
		);
		return rewriteNode(rendered, policy, cache);
	}

	const nextProps: ImageProps = { ...props };
	const dimensions = getImageDimensions(props);

	if (type === "img" && typeof props.src === "string") {
		const willBeQuantized =
			policy.mode === "on" && !isSkippableImageSrc(props.src);
		nextProps.src = await prepareSrc({
			src: props.src,
			policy,
			...dimensions,
			cache,
		});
		if (willBeQuantized) {
			// The prepared image is hard-quantized to the device palette/bit
			// depth. Any smooth (bilinear/bicubic) upscale during compositing
			// would blend those exact levels back into in-between grays,
			// undoing the dither. Nearest-neighbor keeps it crisp.
			nextProps.style = { ...nextProps.style, imageRendering: "pixelated" };
		}
	}

	if (
		(type === "img" || type === "source") &&
		typeof props.srcSet === "string"
	) {
		nextProps.srcSet = await rewriteSrcSet({
			srcSet: props.srcSet,
			policy,
			...dimensions,
			cache,
		});
	}

	if (props.children) {
		const children = await Promise.all(
			React.Children.toArray(props.children).map((child) =>
				rewriteNode(child, policy, cache),
			),
		);
		nextProps.children = children;
	}

	return React.cloneElement(node, nextProps);
}

export async function rewriteReactImagesForDevice(
	node: React.ReactElement,
	policy: ImageDitherPolicy,
): Promise<React.ReactElement> {
	if (policy.mode === "off") return node;
	const rewritten = await rewriteNode(node, policy, new Map());
	return React.isValidElement(rewritten) ? rewritten : node;
}

export async function rewritePageImagesForDevice(
	page: Page,
	policy: ImageDitherPolicy,
): Promise<void> {
	if (policy.mode === "off") return;

	const images = await page.evaluate(() =>
		Array.from(document.images)
			.map((image, index) => {
				const rect = image.getBoundingClientRect();
				const id = `byos-device-image-${index}`;
				image.setAttribute("data-byos-device-image-id", id);
				return {
					id,
					src: image.currentSrc || image.src,
					width: Math.round(rect.width),
					height: Math.round(rect.height),
				};
			})
			.filter((image) => image.src),
	);

	const cache = new Map<string, Promise<string>>();
	const replacements = await Promise.all(
		(images as PreparedImageEntry[]).map(async (image) => ({
			id: image.id,
			pixelated: !isSkippableImageSrc(image.src),
			src: await prepareSrc({
				src: image.src,
				policy,
				width: image.width,
				height: image.height,
				cache,
			}),
		})),
	);

	await page.evaluate((nextImages) => {
		for (const image of nextImages) {
			const node = document.querySelector<HTMLImageElement>(
				`img[data-byos-device-image-id="${image.id}"]`,
			);
			if (!node) continue;
			if (image.pixelated) {
				// See the matching comment in the React intercept: preserve
				// the hard-quantized dither through any later scaling.
				node.style.imageRendering = "pixelated";
			}
			if (node.src === image.src) continue;
			node.src = image.src;
			node.removeAttribute("srcset");
			const picture = node.closest("picture");
			for (const source of Array.from(
				picture?.querySelectorAll("source") ?? [],
			)) {
				source.removeAttribute("srcset");
			}
		}
	}, replacements);
}
