import sharp from "sharp";
import type { DeviceProfile } from "@/lib/trmnl/device-profile";
import { type RGB, resolvePaletteColors } from "@/lib/trmnl/palette-colors";

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

type Lab = {
	l: number;
	a: number;
	b: number;
};

const MIME_EXTENSION: Record<string, string> = {
	"image/bmp": "bmp",
	"image/png": "png",
	"image/webp": "webp",
};

export function getImageFilenameExtension(profile: DeviceProfile): string {
	return (
		MIME_EXTENSION[profile.model.mime_type] ??
		profile.model.mime_type.split("/").at(-1) ??
		"bin"
	);
}

function clampByte(value: number): number {
	return Math.max(0, Math.min(255, value));
}

function pivotRgb(value: number): number {
	const normalized = value / 255;
	return normalized <= 0.04045
		? normalized / 12.92
		: ((normalized + 0.055) / 1.055) ** 2.4;
}

function pivotXyz(value: number): number {
	return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function rgbToLab(color: RGB): Lab {
	const r = pivotRgb(color.r);
	const g = pivotRgb(color.g);
	const b = pivotRgb(color.b);

	const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
	const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1;
	const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

	const fx = pivotXyz(x);
	const fy = pivotXyz(y);
	const fz = pivotXyz(z);

	return {
		l: 116 * fy - 16,
		a: 500 * (fx - fy),
		b: 200 * (fy - fz),
	};
}

function labDistanceSquared(a: Lab, b: Lab): number {
	return (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;
}

function nearestColor(color: RGB, palette: Array<RGB & { lab: Lab }>): RGB {
	const lab = rgbToLab(color);
	let best = palette[0];
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of palette) {
		const distance = labDistanceSquared(lab, candidate.lab);
		if (distance < bestDistance) {
			best = candidate;
			bestDistance = distance;
		}
	}

	return best;
}

function distributeError(
	pixels: Float64Array,
	width: number,
	height: number,
	x: number,
	y: number,
	error: RGB,
	factor: number,
): void {
	if (x < 0 || x >= width || y < 0 || y >= height) {
		return;
	}

	const index = (y * width + x) * 3;
	pixels[index] += error.r * factor;
	pixels[index + 1] += error.g * factor;
	pixels[index + 2] += error.b * factor;
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

async function quantizeToPalette(
	png: Buffer,
	paletteColors: RGB[],
): Promise<Buffer> {
	const source = await sharp(png)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const { width, height } = source.info;
	const palette = paletteColors.map((color) => ({
		...color,
		lab: rgbToLab(color),
	}));
	const pixels = new Float64Array(source.data.length);

	for (let index = 0; index < source.data.length; index++) {
		pixels[index] = source.data[index] ?? 0;
	}

	const output = Buffer.alloc(source.data.length);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 3;
			const oldColor = {
				r: clampByte(pixels[index]),
				g: clampByte(pixels[index + 1]),
				b: clampByte(pixels[index + 2]),
			};
			const nextColor = nearestColor(oldColor, palette);

			output[index] = nextColor.r;
			output[index + 1] = nextColor.g;
			output[index + 2] = nextColor.b;

			const error = {
				r: oldColor.r - nextColor.r,
				g: oldColor.g - nextColor.g,
				b: oldColor.b - nextColor.b,
			};

			distributeError(pixels, width, height, x + 1, y, error, 7 / 16);
			distributeError(pixels, width, height, x - 1, y + 1, error, 3 / 16);
			distributeError(pixels, width, height, x, y + 1, error, 5 / 16);
			distributeError(pixels, width, height, x + 1, y + 1, error, 1 / 16);
		}
	}

	return sharp(output, { raw: { width, height, channels: 3 } })
		.png()
		.toBuffer();
}

async function encode(
	png: Buffer,
	mimeType: string,
	imageSizeLimit?: number,
): Promise<{ buffer: Buffer; sizeLimitExceeded: boolean }> {
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

	const buffer = await sharp(png).png({ compressionLevel: 9 }).toBuffer();
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
	const paletteColors = resolvePaletteColors(
		profile.palette ?? { id: "", name: "" },
	);
	const quantized =
		paletteColors && profile.model.bit_depth < 24
			? await quantizeToPalette(transformed, paletteColors)
			: transformed;
	const { buffer, sizeLimitExceeded } = await encode(
		quantized,
		profile.model.mime_type,
		profile.model.image_size_limit,
	);

	return {
		buffer,
		mime_type: profile.model.mime_type,
		filename_ext: getImageFilenameExtension(profile),
		size_limit_exceeded: sizeLimitExceeded,
	};
}
