import sharp from "sharp";
import {
	quantizePngChannels,
	reducePngToPalette,
} from "@/lib/render/palette-reduction";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import {
	deviceRenderTargetNeedsReduction,
	resolveDeviceRenderTarget,
} from "@/lib/trmnl/palette-colors";

export type PrepareImageForDeviceInput = {
	src: string | Buffer | Uint8Array;
	profile: DeviceProfile;
	width?: number;
	height?: number;
	dither?: "floyd-steinberg";
};

export type PreparedDeviceImage = {
	buffer: Buffer;
	dataUrl: string;
};

function parseDataUrl(src: string): Buffer | null {
	const match = src.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
	if (!match) return null;
	const [, , base64Flag, payload = ""] = match;
	return base64Flag
		? Buffer.from(payload, "base64")
		: Buffer.from(decodeURIComponent(payload));
}

async function loadImageSource(
	src: string | Buffer | Uint8Array,
): Promise<Buffer> {
	if (Buffer.isBuffer(src)) return src;
	if (src instanceof Uint8Array) return Buffer.from(src);

	const dataUrl = parseDataUrl(src);
	if (dataUrl) return dataUrl;

	const response = await fetch(src);
	if (!response.ok) {
		throw new Error(`Failed to fetch image ${src}: ${response.status}`);
	}
	return Buffer.from(await response.arrayBuffer());
}

function normalizeDimension(value: number | undefined): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return undefined;
	}
	return Math.round(value);
}

async function normalizeImageToPng({
	buffer,
	width,
	height,
}: {
	buffer: Buffer;
	width?: number;
	height?: number;
}): Promise<Buffer> {
	const targetWidth = normalizeDimension(width);
	const targetHeight = normalizeDimension(height);
	let image = sharp(buffer).rotate().flatten({ background: "#ffffff" });

	if (targetWidth || targetHeight) {
		image = image.resize(targetWidth, targetHeight, {
			fit: targetWidth && targetHeight ? "fill" : "inside",
			withoutEnlargement: false,
		});
	}

	return image.png().toBuffer();
}

export async function prepareImageForDevice({
	src,
	profile,
	width,
	height,
	dither = "floyd-steinberg",
}: PrepareImageForDeviceInput): Promise<PreparedDeviceImage> {
	const source = await loadImageSource(src);
	const normalized = await normalizeImageToPng({
		buffer: source,
		width,
		height,
	});
	const target = resolveDeviceRenderTarget(profile.palette);

	let buffer = normalized;
	if (!deviceRenderTargetNeedsReduction(target)) {
		buffer = normalized;
	} else if (target.targetPalette) {
		buffer = await reducePngToPalette(normalized, target.targetPalette, dither);
	} else if (
		typeof target.channelBitDepth === "number" &&
		target.channelBitDepth < 8
	) {
		buffer = await quantizePngChannels(normalized, target.channelBitDepth);
	}

	return {
		buffer,
		dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
	};
}
