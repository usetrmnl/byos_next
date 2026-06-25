import { unstable_cache } from "next/cache";
import sharp from "sharp";
import {
	applyDithering,
	DEFAULT_DITHER_SALT,
	DitheringMethod,
} from "@/utils/image-processing";

export type DitherImageOptions = {
	width: number;
	height: number;
	levels: number;
	salt?: number;
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

export async function ditherImageToDataUrlUncached(
	source: string | Buffer,
	options: DitherImageOptions,
): Promise<string> {
	const { width, height, levels, salt = DEFAULT_DITHER_SALT } = options;
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
		const meanLightness =
			grayscale.reduce((sum, value) => sum + value, 0) /
			Math.max(grayscale.length, 1);

		const dithered = applyDithering(DitheringMethod.WHITE_NOISE, grayscale, {
			width: outWidth,
			height: outHeight,
			levels,
			salt,
			meanLightness,
		});

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

	const cacheKey = [
		"dither-image",
		cacheKeyForSource(source),
		String(options.width),
		String(options.height),
		String(options.levels),
		String(options.salt ?? DEFAULT_DITHER_SALT),
	].join(":");

	const cached = unstable_cache(
		async () => ditherImageToDataUrlUncached(source, options),
		[cacheKey],
		{ revalidate: 3600, tags: ["dither-image"] },
	);

	return cached();
}
