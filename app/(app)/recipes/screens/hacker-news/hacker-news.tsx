import { PreSatori } from "@/utils/pre-satori";

interface Story {
	rank: number;
	title: string;
	score: number;
	comments: number;
	by: string;
	domain: string;
	qrPath: string;
	qrSize: number;
}

interface HackerNewsProps {
	stories?: Story[];
	updatedLabel?: string;
	message?: string;
	width?: number;
	height?: number;
}

const clip = (s: string, max: number) =>
	s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;

export default function HackerNews({
	stories = [],
	updatedLabel = "",
	message,
	width = 800,
	height = 480,
}: HackerNewsProps) {
	const HEADER = 30;
	const GAP = 6;
	const count = Math.max(1, stories.length);

	// Two columns; QR hugs the outer edge of each (left col → left, right col → right).
	const leftCount = Math.ceil(count / 2);
	const left = stories.slice(0, leftCount);
	const right = stories.slice(leftCount);
	const rows = Math.max(1, leftCount);

	const bodyH = height - HEADER;
	const cardH = (bodyH - GAP * (rows + 1)) / rows;
	const qr = Math.min(132, Math.max(56, Math.floor(cardH) - 16));

	const qrBlock = (s: Story) => (
		<div
			style={{
				width: qr,
				height: qr,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "#fff",
				flexShrink: 0,
				alignSelf: "center",
			}}
		>
			<svg
				width={qr}
				height={qr}
				viewBox={`0 0 ${s.qrSize} ${s.qrSize}`}
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>QR</title>
				<path d={s.qrPath} fill="#000" />
			</svg>
		</div>
	);

	const card = (s: Story, side: "left" | "right") => (
		<div
			key={s.rank}
			style={{
				flex: 1,
				display: "flex",
				alignItems: "flex-start",
				border: "2px solid #000",
				borderRadius: 10,
				padding: 6,
				overflow: "hidden",
			}}
		>
			{side === "left" ? qrBlock(s) : null}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start",
					overflow: "hidden",
					padding: "2px 10px 0",
				}}
			>
				<div
					className="font-blockKie"
					style={{ fontSize: 18, lineHeight: 1.25, overflow: "hidden" }}
				>
					{s.rank}. {clip(s.title, 80)}
				</div>
				<div className="font-blockKie" style={{ fontSize: 16, marginTop: 5 }}>
					{s.score} pts · {s.comments} comments
				</div>
				<div className="font-blockKie" style={{ fontSize: 16 }}>
					{clip(s.domain, 30)}
				</div>
			</div>
			{side === "right" ? qrBlock(s) : null}
		</div>
	);

	const column = (items: Story[], side: "left" | "right") => (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				gap: GAP,
			}}
		>
			{items.map((s) => card(s, side))}
		</div>
	);

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div
				className="bg-white text-black font-blockKie"
				style={{ display: "flex", flexDirection: "column", width, height }}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						height: HEADER,
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 12px",
					}}
				>
					<div className="font-blockKie" style={{ fontSize: 18 }}>
						Hacker News
					</div>
					<div className="font-blockKie" style={{ fontSize: 16 }}>
						{message
							? ""
							: `Top ${count}${updatedLabel ? `  ·  ${updatedLabel}` : ""}`}
					</div>
				</div>

				{message ? (
					<div
						className="font-blockKie"
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 16,
						}}
					>
						{message}
					</div>
				) : (
					<div
						style={{
							display: "flex",
							flex: 1,
							gap: GAP,
							padding: `0 ${GAP}px ${GAP}px`,
						}}
					>
						{column(left, "left")}
						{column(right, "right")}
					</div>
				)}
			</div>
		</PreSatori>
	);
}
