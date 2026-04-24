import * as d3 from "d3";

export interface GraphDataPoint {
	x: number | Date;
	y: number;
}

export interface GraphProps {
	/** Array of data points to plot */
	data: GraphDataPoint[];
	/** Width of the graph in pixels */
	width?: number;
	/** Height of the graph in pixels */
	height?: number;
	/** Custom margins for the graph */
	margin?: { top: number; right: number; bottom: number; left: number };
	/** Number of ticks on the Y axis */
	yTicks?: number;
	/** Number of ticks on the X axis */
	xTicks?: number;
	/** Format function for Y axis values */
	yAxisFormat?: (value: number) => string;
	/** Format function for X axis values */
	xAxisFormat?: (value: number | Date) => string;
	/** Line color (uses currentColor if not specified) */
	lineColor?: string;
	/** Line width in pixels */
	lineWidth?: number;
	/** Whether to show grid lines */
	showGrid?: boolean;
	/** Grid line style */
	gridStyle?: {
		opacity?: number;
		dashArray?: string;
		color?: string;
	};
	/** Whether x values are dates */
	isTimeData?: boolean;
	/** Type of curve interpolation to use */
	curveType?: "natural" | "monotone" | "step" | "linear";
}

export function Graph({
	data,
	width = 500,
	height = 250,
	margin = { top: 20, right: 20, bottom: 30, left: 60 },
	yTicks = 5,
	xTicks = 4,
	yAxisFormat = (value: number) => d3.format(",.0f")(value),
	xAxisFormat = (value: number | Date) =>
		value instanceof Date
			? value.toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
				})
			: value.toString(),
	lineColor = "currentColor",
	lineWidth = 3,
	showGrid = true,
	gridStyle = {
		opacity: 1,
		dashArray: "4,4",
		color: "currentColor",
	},
	isTimeData = false,
	curveType = "natural",
}: GraphProps) {
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const fontSize = Math.round((50 * Math.max(innerWidth, innerHeight)) / 800);

	// Create scales
	const xScale = isTimeData
		? d3
				.scaleTime()
				.domain(d3.extent(data, (d) => d.x as Date) as [Date, Date])
				.range([0, innerWidth])
		: d3
				.scaleLinear()
				.domain(d3.extent(data, (d) => d.x as number) as [number, number])
				.range([0, innerWidth]);

	const yScale = d3
		.scaleLinear()
		.domain([
			(d3.min(data, (d) => d.y) as number) * 0.99,
			(d3.max(data, (d) => d.y) as number) * 1.01,
		])
		.range([innerHeight, 0]);

	// Get curve type
	const getCurve = () => {
		switch (curveType) {
			case "natural":
				return d3.curveCatmullRom;
			case "monotone":
				return d3.curveMonotoneX;
			case "step":
				return d3.curveStep;
			case "linear":
				return d3.curveLinear;
			default:
				return d3.curveCatmullRom;
		}
	};

	// Create line generator
	const line = d3
		.line<GraphDataPoint>()
		.x((d) => xScale(d.x))
		.y((d) => yScale(d.y))
		.curve(getCurve());

	// Generate grid lines
	const generateGridLines = (): string => {
		if (!showGrid) return "";

		const xTickValues = xScale.ticks(xTicks);
		const yTickValues = yScale.ticks(yTicks);

		return `
      <g>
        ${xTickValues
					.map((tick) => {
						const x = xScale(tick);
						return `<line 
            x1="${x}" 
            x2="${x}" 
            y1="0" 
            y2="${innerHeight}" 
            stroke="${gridStyle.color}"
            stroke-opacity="${gridStyle.opacity}"
            stroke-dasharray="${gridStyle.dashArray}"
          />`;
					})
					.join("")}
        ${yTickValues
					.map((tick) => {
						const y = yScale(tick);
						return `<line 
            x1="0" 
            x2="${innerWidth}" 
            y1="${y}" 
            y2="${y}" 
            stroke="${gridStyle.color}"
            stroke-opacity="${gridStyle.opacity}"
            stroke-dasharray="${gridStyle.dashArray}"
          />`;
					})
					.join("")}
      </g>
    `;
	};

	// Generate SVG string
	const svgString = `
    <svg 
      width="${innerWidth}" 
      height="${innerHeight}" 
      viewBox="0 0 ${innerWidth} ${innerHeight}" 
      style="max-width: 100%; height: auto;"
      xmlns="http://www.w3.org/2000/svg"
    >
      ${showGrid ? generateGridLines() : ""}
      <path
        fill="none"
        stroke="${lineColor}"
        stroke-width="${lineWidth}"
        d="${line(data)}"
      />
    </svg>
  `.trim();

	const yAxisTicks = yScale.ticks(yTicks).reverse();
	const xAxisTicks = xScale.ticks(xTicks);

	return (
		<div
			className="w-full h-full"
			style={{
				display: "flex",
				flexDirection: "row",
				width: width,
				height: height,
				position: "relative",
			}}
		>
			{/* Y-axis */}
			<div
				style={{
					display: "flex",
					width: margin.left,
					height: innerHeight,
					position: "absolute",
					left: 0,
					top: margin.top,
				}}
			>
				{yAxisTicks.map((tick) => {
					const y = yScale(tick);
					return (
						<div
							key={tick}
							style={{
								position: "absolute",
								right: "5px",
								top: `${y}px`,
								transform: "translateY(-50%)",
								fontSize: `${fontSize}px`,
								color: "currentColor",
								whiteSpace: "nowrap",
							}}
						>
							{yAxisFormat(tick)}
						</div>
					);
				})}
			</div>

			{/* Graph container */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					marginLeft: margin.left,
					marginTop: margin.top,
					marginRight: margin.right,
					marginBottom: margin.bottom,
				}}
			>
				<div style={{ display: "flex" }}>
					{/* biome-ignore lint/performance/noImgElement: Using data URI SVG, Next.js Image doesn't support this */}
					<img
						src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
						alt="Line graph"
						width={innerWidth}
						height={innerHeight}
						style={{ display: "block" }}
					/>
				</div>

				{/* X-axis */}
				<div
					style={{
						display: "flex",
						position: "relative",
						height: "30px",
						width: innerWidth,
					}}
				>
					{xAxisTicks.map((tick) => {
						const x = xScale(tick);
						return (
							<div
								key={typeof tick === "number" ? tick : tick.getTime()}
								style={{
									position: "absolute",
									left: `${x}px`,
									transform: "translateX(-50%)",
									fontSize: `${fontSize}px`,
									color: "currentColor",
									whiteSpace: "nowrap",
								}}
							>
								{xAxisFormat(tick)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
