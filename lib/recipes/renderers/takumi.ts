import { extractResourceUrls, Renderer } from "@takumi-rs/core";
import { fetchResources } from "@takumi-rs/helpers";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import React from "react";
import { getTakumiFonts } from "@/lib/fonts";

const renderer = new Renderer({ fonts: getTakumiFonts() });

export async function renderWithTakumi(
	element: React.ReactElement,
	width: number,
	height: number,
): Promise<Buffer> {
	const node = await fromJsx(element);
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
	const png = await renderer.render(node, {
		width,
		height,
		format: "png",
		fetchedResources,
	});
	return Buffer.from(png);
}
