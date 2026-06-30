import type { Page } from "puppeteer-core";
import React from "react";
import { prepareImageForDevice } from "@/lib/render/device-image-prep";
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

function isSkippableImageSrc(src: string): boolean {
	const trimmed = src.trim();
	return (
		trimmed.length === 0 ||
		trimmed.startsWith("data:") ||
		trimmed.startsWith("blob:") ||
		trimmed.startsWith("#")
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

	const key = `${src}|${width ?? ""}|${height ?? ""}`;
	const cached = cache.get(key);
	if (cached) return cached;

	const prepared = prepareImageForDevice({
		src,
		profile: policy.profile,
		width,
		height,
		dither: "floyd-steinberg",
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
		nextProps.src = await prepareSrc({
			src: props.src,
			policy,
			...dimensions,
			cache,
		});
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
			if (!node || node.src === image.src) continue;
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
