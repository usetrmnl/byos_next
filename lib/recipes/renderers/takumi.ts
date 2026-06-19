import { extractResourceUrls, Renderer } from "@takumi-rs/core";
import { fetchResources } from "@takumi-rs/helpers";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import React from "react";
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
	const png = await renderer.render(normalizedNode, {
		width,
		height,
		format: "png",
		fetchedResources,
	});
	return Buffer.from(png);
}
