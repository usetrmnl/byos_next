"use client";

import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";

/**
 * Browser preview for liquid recipes.
 * Uses an iframe with srcdoc — the HTML already contains TRMNL CSS and JS.
 */
export default function LiquidPreview({
	html,
	width,
	height,
}: {
	html: string;
	width?: number;
	height?: number;
}) {
	const w = width ?? DEFAULT_IMAGE_WIDTH;
	const h = height ?? DEFAULT_IMAGE_HEIGHT;

	return (
		<iframe
			srcDoc={html}
			width={w}
			height={h}
			title="Liquid recipe preview"
			style={{ border: "none" }}
		/>
	);
}
