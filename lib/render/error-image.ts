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

function cleanMessage(message: string): string {
	const cleaned = message.replace(/\s+/g, " ").trim();
	return cleaned || "Rendering error";
}

function wrapText(
	message: string,
	maxChars: number,
	maxLines: number,
): string[] {
	const words = cleanMessage(message).split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const next = current ? `${current} ${word}` : word;
		if (next.length > maxChars && current) {
			lines.push(current);
			current = word;
		} else {
			current = next;
		}
	}
	if (current) lines.push(current);
	const clipped = lines.slice(0, maxLines);
	if (lines.length > maxLines) {
		clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[. ]+$/, "")}...`;
	}
	return clipped;
}

function textNodes(
	lines: string[],
	options: { x: number; y: number; gap: number },
) {
	return lines
		.map(
			(line, index) =>
				`<text x="${options.x}" y="${options.y + index * options.gap}" class="body">${escapeXml(line)}</text>`,
		)
		.join("");
}

async function renderErrorPng(message: string, width: number, height: number) {
	const pad = Math.max(24, Math.round(Math.min(width, height) * 0.065));
	const stroke = Math.max(4, Math.round(Math.min(width, height) * 0.012));
	const titleSize = Math.max(28, Math.round(width * 0.05));
	const labelSize = Math.max(15, Math.round(width * 0.021));
	const bodySize = Math.max(24, Math.round(width * 0.039));
	const hintSize = Math.max(17, Math.round(width * 0.024));
	const eyebrowY = pad + Math.round(pad * 0.85);
	const titleY = eyebrowY + Math.round(titleSize * 1.05);
	const contentTop = titleY + Math.round(pad * 0.85);
	const actionHeight = Math.max(48, Math.round(height * 0.105));
	const actionTop = height - pad - actionHeight - Math.round(pad * 0.25);
	const contentBottom = actionTop - Math.round(pad * 0.65);
	const contentHeight = Math.max(80, contentBottom - contentTop);
	const iconSize = Math.min(
		Math.round(width * 0.15),
		Math.round(contentHeight * 0.62),
	);
	const iconX = pad + Math.round(pad * 0.65);
	const iconY = contentTop + Math.round((contentHeight - iconSize) / 2);
	const messageX = iconX + iconSize + Math.round(pad * 0.85);
	const messageWidth = width - messageX - pad - stroke;
	const lineHeight = Math.round(bodySize * 1.22);
	const maxLines = Math.max(2, Math.floor(contentHeight / lineHeight));
	const maxChars = Math.max(18, Math.floor(messageWidth / (bodySize * 0.56)));
	const lines = wrapText(message, maxChars, maxLines);
	const bodyBlockHeight = (lines.length - 1) * lineHeight + bodySize;
	const bodyStartY =
		contentTop + Math.round((contentHeight - bodyBlockHeight) / 2) + bodySize;
	const body = textNodes(lines, {
		x: messageX,
		y: bodyStartY,
		gap: lineHeight,
	});
	const hintY = actionTop + Math.round(actionHeight * 0.64);
	const cardRadius = Math.round(pad * 0.55);
	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fff"/>
  <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${height - pad * 2}" rx="${cardRadius}" fill="#fff" stroke="#000" stroke-width="${stroke}"/>
  <text x="${pad + Math.round(pad * 0.72)}" y="${eyebrowY}" class="label">BYOS DISPLAY</text>
  <text x="${pad + Math.round(pad * 0.7)}" y="${titleY}" class="title">Needs attention</text>
  <line x1="${pad + Math.round(pad * 0.7)}" y1="${contentTop - Math.round(pad * 0.45)}" x2="${width - pad - Math.round(pad * 0.7)}" y2="${contentTop - Math.round(pad * 0.45)}" stroke="#000" stroke-width="${Math.max(2, Math.round(stroke * 0.45))}"/>
  <circle cx="${iconX + iconSize / 2}" cy="${iconY + iconSize / 2}" r="${iconSize / 2}" fill="#fff" stroke="#000" stroke-width="${stroke}"/>
  <circle cx="${iconX + iconSize / 2}" cy="${iconY + iconSize * 0.32}" r="${Math.max(4, Math.round(iconSize * 0.045))}" fill="#000"/>
  <line x1="${iconX + iconSize / 2}" y1="${iconY + iconSize * 0.48}" x2="${iconX + iconSize / 2}" y2="${iconY + iconSize * 0.75}" stroke="#000" stroke-width="${Math.max(7, Math.round(iconSize * 0.07))}" stroke-linecap="round"/>
  ${body}
  <rect x="${pad + Math.round(pad * 0.7)}" y="${actionTop}" width="${width - pad * 3.4}" height="${actionHeight}" rx="${Math.round(actionHeight * 0.35)}" fill="#fff" stroke="#000" stroke-width="${Math.max(3, Math.round(stroke * 0.72))}"/>
  <text x="${pad + Math.round(pad * 1.15)}" y="${hintY}" class="hint">Open the BYOS dashboard to fix this screen or recipe</text>
  <style>
    .title { font: 800 ${titleSize}px sans-serif; letter-spacing: ${Math.max(0.5, width * 0.001)}px; fill: #000; }
    .label { font: 800 ${labelSize}px sans-serif; letter-spacing: ${Math.max(1, Math.round(width * 0.003))}px; fill: #000; }
    .body { font: 700 ${bodySize}px sans-serif; fill: #000; }
    .hint { font: 750 ${hintSize}px sans-serif; fill: #000; }
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
		return renderDeviceImage({
			png,
			profile: {
				...profile,
				model: {
					...profile.model,
					width,
					height,
				},
			},
		});
	}
	return {
		buffer: await renderBmp(png, { width, height, grayscale }),
		mime_type: "image/bmp",
		filename_ext: "bmp",
		size_limit_exceeded: false,
	};
}
