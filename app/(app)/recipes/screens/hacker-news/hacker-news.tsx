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
	const PADX = 8;
	const GAP = 6;
	const bodyH = height - HEADER;
	const count = Math.max(1, stories.length);
	const cardH = Math.floor(bodyH / count) - GAP;
	const qr = Math.max(40, cardH - 8);

	const qrBlock = (s: Story) => (
		<div
			style={{
				width: qr,
				height: qr,
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
	);

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
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							padding: `0 ${PADX}px`,
						}}
					>
						{stories.map((s, i) => {
							const qrLeft = i % 2 === 1; // ranks 2,4,6 on the left
							return (
								<div
									key={s.rank}
									style={{
										display: "flex",
										alignItems: "center",
										height: cardH,
										marginBottom: GAP,
										border: "2px solid #000",
										borderRadius: 10,
										padding: 5,
										overflow: "hidden",
									}}
								>
									{qrLeft ? qrBlock(s) : null}
									<div
										style={{
											flex: 1,
											display: "flex",
											flexDirection: "column",
											justifyContent: "center",
											overflow: "hidden",
											padding: "0 12px",
										}}
									>
										<div
											style={{
												fontSize: 18,
												lineHeight: 1.12,
												overflow: "hidden",
											}}
										>
											{s.rank}. {clip(s.title, 84)}
										</div>
										<div style={{ fontSize: 13, marginTop: 3 }}>
											{s.score} pts · {s.comments} comments ·{" "}
											{clip(s.domain, 30)}
										</div>
									</div>
									{qrLeft ? null : qrBlock(s)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</PreSatori>
	);
}
