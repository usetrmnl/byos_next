import {
	type PaletteGrayLevel,
	VALID_GRAY_LEVELS,
} from "@/lib/trmnl/palette-colors";
import { grayPaletteIndex, grayPaletteValue } from "./quantize";

export type BmpGrayLevel = PaletteGrayLevel;

export function assertBmpGrayLevel(
	levels: number,
): asserts levels is BmpGrayLevel {
	if (!VALID_GRAY_LEVELS.includes(levels as BmpGrayLevel)) {
		throw new Error(
			`Invalid BMP palette levels: ${levels}. Must be one of: ${VALID_GRAY_LEVELS.join(", ")}`,
		);
	}
}

function createGrayPaletteEntries(levels: BmpGrayLevel): number[] {
	return Array.from({ length: levels }, (_, index) => {
		const grayValue = grayPaletteValue(index, levels);
		return (grayValue << 16) | (grayValue << 8) | grayValue;
	});
}

function shouldSetMonochromeBit(
	paletteIndex: number,
	levels: BmpGrayLevel,
): boolean {
	return paletteIndex === levels - 1;
}

export function encodeGrayBmp({
	gray,
	width,
	height,
	levels,
	inverted = false,
}: {
	gray: Uint8Array;
	width: number;
	height: number;
	levels: BmpGrayLevel;
	inverted?: boolean;
}): Uint8Array {
	assertBmpGrayLevel(levels);

	const targetPixelCount = width * height;
	if (gray.length < targetPixelCount) {
		throw new Error(
			`Invalid grayscale raster: expected at least ${targetPixelCount} pixels, received ${gray.length}`,
		);
	}

	const bitsPerPixel =
		levels === 2 ? 1 : levels === 4 ? 2 : levels === 16 ? 4 : 8;
	const paletteSize = levels * 4;
	const fileHeaderSize = 14;
	const infoHeaderSize = 40;
	const rowSize = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
	const dataOffset = fileHeaderSize + infoHeaderSize + paletteSize;
	const fileSize = dataOffset + rowSize * height;
	const buffer = new Uint8Array(fileSize);
	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	buffer[0] = 0x42; // B
	buffer[1] = 0x4d; // M
	view.setUint32(2, fileSize, true);
	view.setUint32(6, 0, true);
	view.setUint32(10, dataOffset, true);

	view.setUint32(14, infoHeaderSize, true);
	view.setInt32(18, width, true);
	view.setInt32(22, height, true);
	view.setUint16(26, 1, true);
	view.setUint16(28, bitsPerPixel, true);
	view.setUint32(30, 0, true);
	view.setUint32(34, rowSize * height, true);
	view.setInt32(38, 0, true);
	view.setInt32(42, 0, true);
	view.setUint32(46, levels, true);
	view.setUint32(50, levels, true);

	const paletteOffset = fileHeaderSize + infoHeaderSize;
	for (const [index, paletteEntry] of createGrayPaletteEntries(
		levels,
	).entries()) {
		view.setUint32(paletteOffset + index * 4, paletteEntry, true);
	}

	for (let y = 0; y < height; y++) {
		const targetY = height - 1 - y;
		const yOffset = targetY * width;
		const destRowOffset = dataOffset + y * rowSize;

		if (bitsPerPixel === 1) {
			for (let x = 0; x < width; x += 8) {
				let byte = 0;
				const remainingPixels = Math.min(8, width - x);
				for (let bit = 0; bit < remainingPixels; bit++) {
					const idx = yOffset + x + bit;
					let paletteIndex = grayPaletteIndex(gray[idx] ?? 0, levels);
					if (inverted) paletteIndex = levels - 1 - paletteIndex;
					if (shouldSetMonochromeBit(paletteIndex, levels)) {
						byte |= 1 << (7 - bit);
					}
				}
				buffer[destRowOffset + (x >> 3)] = byte;
			}
		} else if (bitsPerPixel === 2) {
			for (let x = 0; x < width; x += 4) {
				let byte = 0;
				const remainingPixels = Math.min(4, width - x);
				for (let bit = 0; bit < remainingPixels; bit++) {
					const idx = yOffset + x + bit;
					let paletteIndex = grayPaletteIndex(gray[idx] ?? 0, levels);
					if (inverted) paletteIndex = levels - 1 - paletteIndex;
					byte |= paletteIndex << (6 - bit * 2);
				}
				buffer[destRowOffset + (x >> 2)] = byte;
			}
		} else if (bitsPerPixel === 4) {
			for (let x = 0; x < width; x += 2) {
				let byte = 0;
				const remainingPixels = Math.min(2, width - x);
				for (let bit = 0; bit < remainingPixels; bit++) {
					const idx = yOffset + x + bit;
					let paletteIndex = grayPaletteIndex(gray[idx] ?? 0, levels);
					if (inverted) paletteIndex = levels - 1 - paletteIndex;
					byte |= paletteIndex << (4 - bit * 4);
				}
				buffer[destRowOffset + (x >> 1)] = byte;
			}
		} else {
			for (let x = 0; x < width; x++) {
				const idx = yOffset + x;
				let paletteIndex = grayPaletteIndex(gray[idx] ?? 0, levels);
				if (inverted) paletteIndex = levels - 1 - paletteIndex;
				buffer[destRowOffset + x] = paletteIndex;
			}
		}
	}

	return buffer;
}
