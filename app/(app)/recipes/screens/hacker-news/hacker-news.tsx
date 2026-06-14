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
	const HEADER = 34;
	const bodyH = height - HEADER;
	const count = Math.max(1, stories.length);
	const rowH = bodyH / count;
	const qr = Math.min(rowH - 8, 70);

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div
				className="bg-white text-black"
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
						borderBottom: "2px solid #000",
					}}
				>
					<div style={{ fontSize: 19 }}>Hacker News</div>
					<div style={{ fontSize: 12 }}>
						{message
							? ""
							: `Top ${count}${updatedLabel ? `  ·  ${updatedLabel}` : ""}`}
					</div>
				</div>

				{message ? (
					<div
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
					stories.map((s, i) => (
						<div
							key={s.rank}
							style={{
								display: "flex",
								height: rowH,
								alignItems: "center",
								padding: "0 12px",
								borderBottom:
									i < stories.length - 1 ? "1px solid #000" : "none",
							}}
						>
							{/* Rank */}
							<div
								style={{
									width: 30,
									fontSize: 22,
									display: "flex",
									justifyContent: "center",
								}}
							>
								{s.rank}
							</div>
							{/* Title + meta */}
							<div
								style={{
									flex: 1,
									display: "flex",
									flexDirection: "column",
									justifyContent: "center",
									overflow: "hidden",
									paddingLeft: 8,
									paddingRight: 10,
								}}
							>
								<div
									style={{ fontSize: 16, lineHeight: 1.12, overflow: "hidden" }}
								>
									{clip(s.title, 90)}
								</div>
								<div style={{ fontSize: 12, marginTop: 2 }}>
									{s.score} pts · {s.comments} comments · {clip(s.domain, 28)}
								</div>
							</div>
							{/* QR */}
							<div
								style={{
									width: qr + 6,
									height: qr + 6,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: "#fff",
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
						</div>
					))
				)}
			</div>
		</PreSatori>
	);
}
