/** Resolve trace canvas size and baseline row from grid + optional manual v2 metrics. */

export function resolveTraceLayout(grid) {
	const gridHeight = grid.height;
	const v2Metrics = grid.v2Metrics;

	if (!v2Metrics) {
		return {
			gridHeight,
			traceHeight: gridHeight,
			baselineRow: gridHeight - 1,
			v2Metrics: null,
		};
	}

	const metricHeight = v2Metrics.maxY - v2Metrics.minY + 1;
	const traceHeight = Math.max(
		gridHeight + Math.max(0, -v2Metrics.minY),
		metricHeight,
		gridHeight,
	);

	return {
		gridHeight,
		traceHeight,
		baselineRow: gridHeight - 1,
		v2Metrics,
	};
}

/** Font size for metric-anchored tracing: 1 em row = 1 grid pixel row (no per-glyph bbox scale). */
export function resolveMetricFontSize(grid, layout) {
	return grid.metricFontSize ?? layout.gridHeight;
}

export function legacyMetricsFromTraceLayout(layout, dynamicWidth = false) {
	const { traceHeight, baselineRow, gridHeight, v2Metrics } = layout;

	return {
		cellHeight: traceHeight,
		capTop: v2Metrics
			? baselineRow - v2Metrics.capHeightY
			: 0,
		baselineRow,
		descenderDepth: v2Metrics ? -v2Metrics.descenderY : 0,
		xHeight:
			v2Metrics?.xHeightY ??
			Math.max(1, Math.floor(gridHeight * 0.6)),
		lineHeight: v2Metrics?.lineGap ?? gridHeight,
		pixelUnitX: 1,
		pixelUnitY: 1,
		dynamicWidth,
	};
}
