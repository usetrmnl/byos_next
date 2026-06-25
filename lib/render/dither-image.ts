import { unstable_cache } from "next/cache";
import sharp from "sharp";
import {
	applyDithering,
	DEFAULT_DITHER_SALT,
	DitheringMethod,
} from "@/utils/image-processing";

export { DitheringMethod };

export type DitherImageOptions = {
	width: number;
	height: number;
	levels: number;
	method?: DitheringMethod;
	bayerPatternSize?: 2 | 4 | 8;
	salt?: number;
};

export type EmbedImageOptions = {
	width: number;
	height: number;
};

async function loadImageBytes(source: string | Buffer): Promise<Buffer | null> {
	if (Buffer.isBuffer(source)) {
		return source;
	}

	if (source.startsWith("data:")) {
		const commaIndex = source.indexOf(",");
		if (commaIndex === -1) return null;
		const metadata = source.slice(0, commaIndex);
		const payload = source.slice(commaIndex + 1);
		if (metadata.includes(";base64")) {
			return Buffer.from(payload, "base64");
		}
		return Buffer.from(decodeURIComponent(payload), "utf8");
	}

	if (source.startsWith("http://") || source.startsWith("https://")) {
		const response = await fetch(source, {
			headers: {
				"User-Agent":
					"BYOS-Next/1.0 (image embed; +https://github.com/ghcpuman902/byos_next)",
			},
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) return null;
		return Buffer.from(await response.arrayBuffer());
	}

	return null;
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
	const originalSource = typeof source === "string" ? source : null;
	const { width, height } = options;

	try {
		const bytes = await loadImageBytes(source);
		if (!bytes) {
			return originalSource ?? "";
		}

		const png = await sharp(bytes)
			.resize(width, height, { fit: "cover" })
			.png()
			.toBuffer();

		return `data:image/png;base64,${png.toString("base64")}`;
	} catch (error) {
		console.warn("[embedImageToDataUrl] Failed to embed image:", error);
		return originalSource ?? "";
	}
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
	const {
		width,
		height,
		levels,
		method = DitheringMethod.WHITE_NOISE,
		bayerPatternSize = 8,
		salt = DEFAULT_DITHER_SALT,
	} = options;
	const originalSource = typeof source === "string" ? source : null;

	try {
		const bytes = await loadImageBytes(source);
		if (!bytes) {
			return originalSource ?? "";
		}

		const resized = await sharp(bytes)
			.resize(width, height, { fit: "cover" })
			.grayscale()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const { width: outWidth, height: outHeight } = resized.info;
		const grayscale = new Uint8Array(resized.data);

		const ditherOptions: Parameters<typeof applyDithering>[2] = {
			width: outWidth,
			height: outHeight,
			levels,
			bayerPatternSize,
		};

		if (method === DitheringMethod.WHITE_NOISE) {
			ditherOptions.salt = salt;
			ditherOptions.meanLightness =
				grayscale.reduce((sum, value) => sum + value, 0) /
				Math.max(grayscale.length, 1);
		}

		const dithered = applyDithering(method, grayscale, ditherOptions);

		const png = await sharp(Buffer.from(dithered), {
			raw: { width: outWidth, height: outHeight, channels: 1 },
		})
			.png()
			.toBuffer();

		return `data:image/png;base64,${png.toString("base64")}`;
	} catch (error) {
		console.warn("[ditherImageToDataUrl] Failed to dither image:", error);
		return originalSource ?? "";
	}
}

export async function ditherImageToDataUrl(
	source: string | Buffer,
	options: DitherImageOptions,
): Promise<string> {
	if (typeof source !== "string") {
		return ditherImageToDataUrlUncached(source, options);
	}

	const method = options.method ?? DitheringMethod.WHITE_NOISE;
	const bayerPatternSize = options.bayerPatternSize ?? 8;
	const cacheKey = [
		"dither-image",
		cacheKeyForSource(source),
		String(options.width),
		String(options.height),
		String(options.levels),
		method,
		String(bayerPatternSize),
		String(options.salt ?? DEFAULT_DITHER_SALT),
	].join(":");

	const cached = unstable_cache(
		async () => ditherImageToDataUrlUncached(source, options),
		[cacheKey],
		{ revalidate: 3600, tags: ["dither-image"] },
	);

	return cached();
}
