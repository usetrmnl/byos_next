import { ImageResponse } from "next/og";
import React from "react";
import { getTakumiFonts } from "@/lib/fonts";

const fonts = getTakumiFonts();

export async function renderWithSatori(
	element: React.ReactElement,
	width: number,
	height: number,
): Promise<Buffer> {
	const imageOptions = {
		width,
		height,
		fonts,
		shapeRendering: 1,
		textRendering: 0,
		imageRendering: 1,
		debug: false,
	};
	const pngResponse = new ImageResponse(element, imageOptions);
	const pngBuffer = await pngResponse.arrayBuffer();
	return Buffer.from(pngBuffer);
}
