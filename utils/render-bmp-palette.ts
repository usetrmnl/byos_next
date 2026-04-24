export function createGrayscalePaletteEntries(grayscale: number): number[] {
	const paletteStep = 255 / (grayscale - 1);

	return Array.from({ length: grayscale }, (_, index) => {
		const grayValue = Math.round(index * paletteStep);
		return (grayValue << 16) | (grayValue << 8) | grayValue;
	});
}

export function mapGrayscaleValueToPaletteIndex(
	value: number,
	grayscale: number,
): number {
	const paletteStep = 255 / (grayscale - 1);
	return Math.round(value / paletteStep);
}

export function shouldSetMonochromeBit(
	paletteIndex: number,
	grayscale: number,
): boolean {
	return paletteIndex === grayscale - 1;
}
