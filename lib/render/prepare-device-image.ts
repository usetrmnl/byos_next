import sharp from "sharp";
import type { RecipeDeviceContext } from "@/lib/recipes/types";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import type { RGB } from "@/lib/trmnl/palette-colors";
import {
	deviceRenderTargetNeedsReduction,
	paletteSupportsColor,
	resolveDeviceRenderTarget,
} from "@/lib/trmnl/palette-colors";
import { applyDithering, DitheringMethod } from "@/utils/image-processing";
import {
	DEFAULT_IMAGE_DITHER_METHOD,
	type ImageDitherMethod,
	imageDitherMethodToGrayscaleMethod,
	imageDitherMethodToPaletteMode,
	normalizeImageDitherMethod,
} from "./image-dither-method";
import { rgbBufferToLStarGray } from "./luminance";
import { quantizePngChannels, reducePngToPalette } from "./palette-reduction";

export type { ImageDitherMethod };
export { DEFAULT_IMAGE_DITHER_METHOD };

export type PrepareDeviceImageInput = {
	src: string | Buffer | Uint8Array;
	profile: DeviceProfile;
	width?: number;
	height?: number;
	method?: ImageDitherMethod;
	bayerPatternSize?: 2 | 4 | 8;
	salt?: number;
};

export type PrepareDeviceImageFromContextInput = {
	src: string | Buffer;
	ctx: RecipeDeviceContext;
	method?: ImageDitherMethod;
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

	const response = await fetch(src, {
		headers: {
			"User-Agent":
				"BYOS-Next/1.0 (image prep; +https://github.com/usetrmnl/byos_next)",
		},
		signal: AbortSignal.timeout(10_000),
	});
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

async function extractLStarGray(
	png: Buffer,
): Promise<{ grayscale: Uint8Array; width: number; height: number }> {
	const source = await sharp(png)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const { width, height, channels } = source.info;
	if (channels === 1) {
		return {
			grayscale: new Uint8Array(source.data),
			width,
			height,
		};
	}
	return {
		grayscale: rgbBufferToLStarGray(source.data),
		width,
		height,
	};
}

async function ditherGrayscalePng({
	png,
	levels,
	method,
	bayerPatternSize = 8,
	salt = 0,
}: {
	png: Buffer;
	levels: number;
	method: ImageDitherMethod;
	bayerPatternSize?: 2 | 4 | 8;
	salt?: number;
}): Promise<Buffer> {
	const { grayscale, width, height } = await extractLStarGray(png);
	const ditherMethod = imageDitherMethodToGrayscaleMethod(method);
	const ditherOptions: Parameters<typeof applyDithering>[2] = {
		width,
		height,
		levels,
		bayerPatternSize,
	};

	if (ditherMethod === DitheringMethod.WHITE_NOISE) {
		ditherOptions.salt = salt;
		ditherOptions.meanLightness =
			grayscale.reduce((sum, value) => sum + value, 0) /
			Math.max(grayscale.length, 1);
	}

	const dithered = applyDithering(ditherMethod, grayscale, ditherOptions);
	return sharp(Buffer.from(dithered), {
		raw: { width, height, channels: 1 },
	})
		.png()
		.toBuffer();
}

function isGrayscalePalette(palette: RGB[]): boolean {
	return palette.every((color) => color.r === color.g && color.g === color.b);
}

async function reducePngForTarget({
	png,
	targetPalette,
	method,
	bayerPatternSize,
	salt,
	levels,
}: {
	png: Buffer;
	targetPalette: RGB[];
	method: ImageDitherMethod;
	bayerPatternSize?: 2 | 4 | 8;
	salt?: number;
	levels?: number | null;
}): Promise<Buffer> {
	if (isGrayscalePalette(targetPalette) && typeof levels === "number") {
		return ditherGrayscalePng({
			png,
			levels,
			method,
			bayerPatternSize,
			salt,
		});
	}

	return reducePngToPalette(
		png,
		targetPalette,
		imageDitherMethodToPaletteMode(method),
		{ bayerPatternSize },
	);
}

export async function prepareDeviceImage({
	src,
	profile,
	width,
	height,
	method = DEFAULT_IMAGE_DITHER_METHOD,
	bayerPatternSize = 8,
	salt = 0,
}: PrepareDeviceImageInput): Promise<PreparedDeviceImage> {
	const source = await loadImageSource(src);
	const normalized = await normalizeImageToPng({
		buffer: source,
		width,
		height,
	});
	const target = resolveDeviceRenderTarget(profile.palette);
	const levels = paletteSupportsColor(profile.palette)
		? null
		: (profile.palette?.grays ?? 2);

	let buffer = normalized;
	if (!deviceRenderTargetNeedsReduction(target)) {
		buffer = normalized;
	} else if (target.targetPalette) {
		buffer = await reducePngForTarget({
			png: normalized,
			targetPalette: target.targetPalette,
			method: normalizeImageDitherMethod(method),
			bayerPatternSize,
			salt,
			levels,
		});
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

export async function prepareDeviceImageFromContext({
	src,
	ctx,
	method = DEFAULT_IMAGE_DITHER_METHOD,
}: PrepareDeviceImageFromContextInput): Promise<string> {
	const originalSource = typeof src === "string" ? src : null;
	try {
		if (ctx.colorPalette?.length) {
			const source = await loadImageSource(src);
			const normalized = await normalizeImageToPng({
				buffer: source,
				width: ctx.width,
				height: ctx.height,
			});
			const buffer = await reducePngForTarget({
				png: normalized,
				targetPalette: ctx.colorPalette,
				method: normalizeImageDitherMethod(method),
				bayerPatternSize: 8,
				salt: ctx.salt,
				levels: null,
			});
			return `data:image/png;base64,${buffer.toString("base64")}`;
		}

		if (ctx.levels === null) {
			const source = await loadImageSource(src);
			const normalized = await normalizeImageToPng({
				buffer: source,
				width: ctx.width,
				height: ctx.height,
			});
			return `data:image/png;base64,${normalized.toString("base64")}`;
		}

		const source = await loadImageSource(src);
		const normalized = await normalizeImageToPng({
			buffer: source,
			width: ctx.width,
			height: ctx.height,
		});
		const buffer = await ditherGrayscalePng({
			png: normalized,
			levels: ctx.levels,
			method: normalizeImageDitherMethod(method),
			bayerPatternSize: 8,
			salt: ctx.salt,
		});
		return `data:image/png;base64,${buffer.toString("base64")}`;
	} catch (error) {
		console.warn("[prepareDeviceImageFromContext] Failed:", error);
		return originalSource ?? "";
	}
}
