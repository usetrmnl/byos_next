import sharp from "sharp";
import { type BmpGrayLevel, encodeGrayBmp } from "@/lib/render/bmp-encoder";
import {
	quantizePngChannels,
	reducePngToPalette,
} from "@/lib/render/palette-reduction";
import { rgbBufferToLStarGray } from "@/lib/render/luminance";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import {
	resolveDeviceRenderTarget,
	VALID_GRAY_LEVELS,
} from "@/lib/trmnl/palette-colors";

export type RenderDeviceImageInput = {
	png: Buffer;
	profile: DeviceProfile;
};

export type RenderDeviceImageResult = {
	buffer: Buffer;
	mime_type: string;
	filename_ext: string;
	size_limit_exceeded: boolean;
};

const MIME_EXTENSION: Record<string, string> = {
	"image/bmp": "bmp",
	"image/png": "png",
	"image/webp": "webp",
};

const BMP_GRAY_LEVELS = new Set<number>(VALID_GRAY_LEVELS);

export function getImageFilenameExtension(profile: DeviceProfile): string {
	return (
		MIME_EXTENSION[profile.model.mime_type] ??
		profile.model.mime_type.split("/").at(-1) ??
		"bin"
	);
}

function bmpPaletteDepthFromTargetColorCount(
	paletteColorCount: number | undefined,
): BmpGrayLevel {
	if (paletteColorCount && BMP_GRAY_LEVELS.has(paletteColorCount)) {
		return paletteColorCount as BmpGrayLevel;
	}
	return 2;
}

async function transformToDeviceCanvas(
	png: Buffer,
	profile: DeviceProfile,
): Promise<Buffer> {
	const image = sharp(png)
		.flatten({ background: "#ffffff" })
		.resize(profile.model.width, profile.model.height, { fit: "cover" });

	const rotated =
		profile.model.rotation === 0 ? image : image.rotate(profile.model.rotation);

	return rotated.png().toBuffer();
}

async function encode(
	png: Buffer,
	mimeType: string,
	imageSizeLimit?: number,
	options: { paletteColorCount?: number } = {},
): Promise<{ buffer: Buffer; sizeLimitExceeded: boolean }> {
	if (mimeType === "image/bmp") {
		const levels = bmpPaletteDepthFromTargetColorCount(
			options.paletteColorCount,
		);
		const source = await sharp(png)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const gray = rgbBufferToLStarGray(source.data);
		const buffer = Buffer.from(
			encodeGrayBmp({
				gray,
				width: source.info.width,
				height: source.info.height,
				levels,
			}),
		);
		return {
			buffer,
			sizeLimitExceeded: Boolean(
				imageSizeLimit && buffer.length > imageSizeLimit,
			),
		};
	}

	if (mimeType === "image/webp") {
		for (const quality of [90, 80, 70, 60, 50]) {
			const buffer = await sharp(png).webp({ quality }).toBuffer();
			if (
				!imageSizeLimit ||
				buffer.length <= imageSizeLimit ||
				quality === 50
			) {
				return {
					buffer,
					sizeLimitExceeded: Boolean(
						imageSizeLimit && buffer.length > imageSizeLimit,
					),
				};
			}
		}
	}

	if (mimeType === "image/png") {
		const candidates: Buffer[] = [
			await sharp(png).png({ compressionLevel: 9, effort: 10 }).toBuffer(),
		];
		if (options.paletteColorCount && options.paletteColorCount <= 256) {
			candidates.push(
				await sharp(png)
					.png({
						palette: true,
						colours: options.paletteColorCount,
						colors: options.paletteColorCount,
						compressionLevel: 9,
						effort: 10,
						dither: 0,
					})
					.toBuffer(),
			);
		}

		const buffer = candidates.reduce((smallest, candidate) =>
			candidate.length < smallest.length ? candidate : smallest,
		);
		return {
			buffer,
			sizeLimitExceeded: Boolean(
				imageSizeLimit && buffer.length > imageSizeLimit,
			),
		};
	}

	const buffer = await sharp(png)
		.png({ compressionLevel: 9, effort: 10 })
		.toBuffer();
	return {
		buffer,
		sizeLimitExceeded: Boolean(
			imageSizeLimit && buffer.length > imageSizeLimit,
		),
	};
}

export async function renderDeviceImage({
	png,
	profile,
}: RenderDeviceImageInput): Promise<RenderDeviceImageResult> {
	const transformed = await transformToDeviceCanvas(png, profile);
	const target = resolveDeviceRenderTarget(profile.palette);

	let quantized: Buffer;
	let paletteColorCount: number | undefined;
	if (target.targetPalette && profile.model.bit_depth < 24) {
		paletteColorCount = target.targetPalette.length;
		quantized = await reducePngToPalette(
			transformed,
			target.targetPalette,
			"snap",
		);
	} else if (
		typeof target.channelBitDepth === "number" &&
		target.channelBitDepth < 8
	) {
		quantized = await quantizePngChannels(transformed, target.channelBitDepth);
	} else {
		quantized = transformed;
	}

	const { buffer, sizeLimitExceeded } = await encode(
		quantized,
		profile.model.mime_type,
		profile.model.image_size_limit,
		{ paletteColorCount },
	);

	return {
		buffer,
		mime_type: profile.model.mime_type,
		filename_ext: getImageFilenameExtension(profile),
		size_limit_exceeded: sizeLimitExceeded,
	};
}
