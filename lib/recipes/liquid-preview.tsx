"use client";

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
	const w = width ?? 800;
	const h = height ?? 480;

	return (
		<iframe srcDoc={html} width={w} height={h} style={{ border: "none" }} />
	);
}
