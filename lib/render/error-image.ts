import sharp from "sharp";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import { renderBmp } from "@/utils/render-bmp";
import {
	type RenderDeviceImageResult,
	renderDeviceImage,
} from "./device-image";

type RenderErrorImageOptions = {
	message: string;
	width?: number;
	height?: number;
	grayscale?: number;
	profile?: DeviceProfile | null;
};

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function wrapText(message: string): string[] {
	const words = message.trim().split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const next = current ? `${current} ${word}` : word;
		if (next.length > 42 && current) {
			lines.push(current);
			current = word;
		} else {
			current = next;
		}
	}
	if (current) lines.push(current);
	return lines.slice(0, 5);
}

async function renderErrorPng(message: string, width: number, height: number) {
	const lines = wrapText(message || "Rendering error");
	const lineHeight = Math.max(24, Math.round(height * 0.06));
	const titleY = Math.round(height * 0.34);
	const bodyStartY = titleY + lineHeight * 1.5;
	const body = lines
		.map(
			(line, index) =>
				`<text x="50%" y="${bodyStartY + index * lineHeight}" text-anchor="middle" class="body">${escapeXml(line)}</text>`,
		)
		.join("");
	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fff"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="18" fill="#fff" stroke="#111" stroke-width="4"/>
  <text x="50%" y="${titleY}" text-anchor="middle" class="title">Display error</text>
  ${body}
  <style>
    .title { font: 700 ${Math.max(28, Math.round(width * 0.05))}px sans-serif; fill: #111; }
    .body { font: 500 ${Math.max(18, Math.round(width * 0.028))}px sans-serif; fill: #333; }
  </style>
</svg>`;
	return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderErrorImage({
	message,
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	grayscale = 2,
	profile,
}: RenderErrorImageOptions): Promise<RenderDeviceImageResult> {
	const png = await renderErrorPng(message, width, height);
	if (profile && profile.model.mime_type !== "image/bmp") {
		return renderDeviceImage({ png, profile });
	}
	return {
		buffer: await renderBmp(png, { width, height, grayscale }),
		mime_type: "image/bmp",
		filename_ext: "bmp",
		size_limit_exceeded: false,
	};
}
