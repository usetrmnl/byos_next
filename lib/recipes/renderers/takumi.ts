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
	const fetchedResources = urls.length > 0 ? await fetchResources(urls) : [];
	const png = await renderer.render(node, {
		width,
		height,
		format: "png",
		fetchedResources,
	});
	return Buffer.from(png);
}
