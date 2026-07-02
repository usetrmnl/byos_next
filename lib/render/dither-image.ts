import { unstable_cache } from "next/cache";
import type { RecipeDeviceContext } from "@/lib/recipes/types";
import {
	DEFAULT_IMAGE_DITHER_METHOD,
	type ImageDitherMethod,
	prepareDeviceImageFromContext,
} from "@/lib/render/prepare-device-image";
import { DitheringMethod } from "@/utils/image-processing";

export type { ImageDitherMethod };
export { DEFAULT_IMAGE_DITHER_METHOD, DitheringMethod };

export type DitherImageOptions = {
	width: number;
	height: number;
	levels: number;
	method?: DitheringMethod | ImageDitherMethod;
	bayerPatternSize?: 2 | 4 | 8;
	salt?: number;
};

export type EmbedImageOptions = {
	width: number;
	height: number;
};

export type PrepareRecipeImageOptions = {
	method?: ImageDitherMethod;
};

function ditheringMethodToImageMethod(
	method: DitheringMethod | ImageDitherMethod | undefined,
): ImageDitherMethod {
	if (!method) return DEFAULT_IMAGE_DITHER_METHOD;
	if (method === DitheringMethod.WHITE_NOISE) return "white-noise";
	if (method === DitheringMethod.FLOYD_STEINBERG) return "floyd-steinberg";
	if (method === DitheringMethod.ATKINSON) return "atkinson";
	if (method === DitheringMethod.THRESHOLD) return "threshold";
	if (method === DitheringMethod.NONE) return "none";
	if (method === DitheringMethod.BAYER) return "bayer";
	if (method === DitheringMethod.RANDOM) return "white-noise";
	return method as ImageDitherMethod;
}

function cacheKeyForSource(source: string | Buffer): string {
	if (Buffer.isBuffer(source)) {
		return `buffer:${source.length}:${source.subarray(0, 32).toString("hex")}`;
	}
	return source;
}

export async function embedImageToDataUrlUncached(
	source: string | Buffer,
	options: EmbedImageOptions,
): Promise<string> {
	const ctx: RecipeDeviceContext = {
		levels: null,
		colorPalette: null,
		width: options.width,
		height: options.height,
		logicalWidth: options.width,
		logicalHeight: options.height,
		pixelRatio: 1,
		salt: 0,
	};
	return prepareDeviceImageFromContext({
		src: source,
		ctx,
		method: "none",
	});
}

export async function embedImageToDataUrl(
	source: string | Buffer,
	options: EmbedImageOptions,
): Promise<string> {
	if (typeof source !== "string") {
		return embedImageToDataUrlUncached(source, options);
	}

	const cacheKey = [
		"embed-image",
		cacheKeyForSource(source),
		String(options.width),
		String(options.height),
	].join(":");

	const cached = unstable_cache(
		async () => embedImageToDataUrlUncached(source, options),
		[cacheKey],
		{ revalidate: 3600, tags: ["embed-image"] },
	);

	return cached();
}

export async function ditherImageToDataUrlUncached(
	source: string | Buffer,
	options: DitherImageOptions,
): Promise<string> {
	const ctx: RecipeDeviceContext = {
		levels: options.levels,
		colorPalette: null,
		width: options.width,
		height: options.height,
		logicalWidth: options.width,
		logicalHeight: options.height,
		pixelRatio: 1,
		salt: options.salt ?? 0,
	};

	return prepareDeviceImageFromContext({
		src: source,
		ctx,
		method: ditheringMethodToImageMethod(options.method),
	});
}

export async function ditherImageToDataUrl(
	source: string | Buffer,
	options: DitherImageOptions,
): Promise<string> {
	if (typeof source !== "string") {
		return ditherImageToDataUrlUncached(source, options);
	}

	const method = ditheringMethodToImageMethod(options.method);
	const bayerPatternSize = options.bayerPatternSize ?? 8;
	const cacheKey = [
		"dither-image",
		cacheKeyForSource(source),
		String(options.width),
		String(options.height),
		String(options.levels),
		method,
		String(bayerPatternSize),
		String(options.salt ?? 0),
	].join(":");

	const cached = unstable_cache(
		async () => ditherImageToDataUrlUncached(source, options),
		[cacheKey],
		{ revalidate: 3600, tags: ["embed-image"] },
	);

	return cached();
}

export async function prepareRecipeImageToDataUrl(
	source: string | Buffer,
	ctx: RecipeDeviceContext,
	options: PrepareRecipeImageOptions = {},
): Promise<string> {
	return prepareDeviceImageFromContext({
		src: source,
		ctx,
		method: options.method ?? DEFAULT_IMAGE_DITHER_METHOD,
	});
}
