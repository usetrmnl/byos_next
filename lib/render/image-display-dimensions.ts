/**
 * Convert a logical layout size (the coordinate space recipes author in) to
 * the physical screen pixel size dithering must target.
 *
 * `<img>` `width`/`height` attributes (and inline CSS `width`/`height`) on a
 * recipe are logical layout pixels — the same space `screen.logicalWidth` /
 * `screen.logicalHeight` describe. The finished recipe is later scaled up to
 * `screen.physicalWidth` / `screen.physicalHeight` (see
 * `wrapLogicalCanvasToTarget`). Dithering must happen at that physical size,
 * not the logical one, or the ordered/error-diffusion pattern gets resampled
 * (blurred) by the final scale step and loses its crisp per-pixel structure.
 */
export function toPhysicalImageDimensions(
	logicalWidth: number | undefined,
	logicalHeight: number | undefined,
	pixelRatio: number,
): { width?: number; height?: number } {
	const ratio =
		typeof pixelRatio === "number" &&
		Number.isFinite(pixelRatio) &&
		pixelRatio > 0
			? pixelRatio
			: 1;

	return {
		width:
			typeof logicalWidth === "number" && logicalWidth > 0
				? Math.max(1, Math.round(logicalWidth * ratio))
				: undefined,
		height:
			typeof logicalHeight === "number" && logicalHeight > 0
				? Math.max(1, Math.round(logicalHeight * ratio))
				: undefined,
	};
}
