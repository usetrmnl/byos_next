import { extractResourceUrls, Renderer } from "@takumi-rs/core";
import { fetchResources } from "@takumi-rs/helpers";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import React from "react";
import sharp from "sharp";
import { getTakumiFonts } from "@/lib/fonts";

const renderer = new Renderer({ fonts: getTakumiFonts() });

function stripEmptyStyleValues<T>(node: T): T {
	if (!node || typeof node !== "object") return node;
	if (Array.isArray(node)) {
		return node.map(stripEmptyStyleValues) as T;
	}

	const record = node as Record<string, unknown>;
	if (
		record.style &&
		typeof record.style === "object" &&
		!Array.isArray(record.style)
	) {
		record.style = Object.fromEntries(
			Object.entries(record.style as Record<string, unknown>).filter(
				([, value]) => value != null,
			),
		);
	}
	if (Array.isArray(record.children)) {
		record.children = record.children.map(stripEmptyStyleValues);
	}
	return node;
}

export async function renderWithTakumi(
	element: React.ReactElement,
	width: number,
	height: number,
): Promise<Buffer> {
	const { node } = await fromJsx(element);
	const normalizedNode = stripEmptyStyleValues(node);
	const urls = extractResourceUrls(node);
	let fetchedResources: Awaited<ReturnType<typeof fetchResources>> = [];
	if (urls.length > 0) {
		try {
			fetchedResources = await fetchResources(urls);
		} catch (error) {
			if (
				process.env.NODE_ENV !== "production" ||
				process.env.DEBUG === "true"
			) {
				console.warn(
					"Failed to fetch some external resources, rendering without them",
					error,
				);
			}
		}
	}
	// Render raw RGBA pixels and encode the PNG with sharp instead of asking
	// Takumi for `format: "png"`. Takumi 1.8.6's PNG encoder emits a corrupt
	// IDAT zlib stream once the output gets large (fails at 1872x1404 and the
	// 2x supersample, valid below ~1600x1200), which libspng/sharp then reject
	// with "pngload_buffer: libspng read error". The raw path is exact and
	// size-independent.
	const raw = await renderer.render(normalizedNode, {
		width,
		height,
		format: "raw",
		fetchedResources,
	});
	const rawBuffer = Buffer.from(raw);
	const pixelCount = width * height;
	if (pixelCount <= 0 || rawBuffer.length % pixelCount !== 0) {
		throw new Error(
			`Unexpected Takumi raw buffer: ${rawBuffer.length} bytes for ${width}x${height}`,
		);
	}
	const channels = rawBuffer.length / pixelCount;
	if (channels !== 3 && channels !== 4) {
		throw new Error(
			`Unexpected Takumi raw buffer: ${rawBuffer.length} bytes for ${width}x${height}`,
		);
	}
	return await sharp(rawBuffer, {
		raw: { width, height, channels: channels as 3 | 4 },
	})
		.png()
		.toBuffer();
}
