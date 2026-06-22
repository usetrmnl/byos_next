import { ImageResponse } from "next/og";

export const alt =
	"TRMNL BYOS — self-hosted device management for TRMNL e-ink displays";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#F8654B";
const BG = "#09090b";

// The TRMNL mark (white petals), drawn inline so Satori renders it natively.
const MARK_PATHS = [
	"M55.5936 34.9473L86.6516 46.5254L80.8841 61.8148L49.8262 50.2367L55.5936 34.9473Z",
	"M105.39 31.166L115.648 62.5238L100.028 67.574L89.7695 36.2161L105.39 31.166Z",
	"M139.403 67.5271L121.137 95.0516L107.426 86.0596L125.692 58.5352L139.403 67.5271Z",
	"M132.017 116.622L98.9824 119.587L97.5059 103.323L130.541 100.359L132.017 116.622Z",
	"M88.7956 141.496L65.8672 117.668L77.7369 106.381L100.666 130.208L88.7956 141.496Z",
	"M42.2852 123.424L46.7287 90.7461L63.0065 92.9336L58.5628 125.611L42.2852 123.424Z",
	"M27.5098 75.9849L55.9796 59.0645L64.4081 73.0799L35.9382 90.0003L27.5098 75.9849Z",
];

function BrandLogo({ size: s }: { size: number }) {
	return (
		<div
			style={{
				display: "flex",
				width: s,
				height: s,
				borderRadius: s * 0.23,
				background: BRAND,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<svg
				width={s * 0.66}
				height={s * 0.66}
				viewBox="0 0 170 169"
				fill="none"
				aria-label="TRMNL"
			>
				{MARK_PATHS.map((d) => (
					<path key={d} d={d} fill="#ffffff" />
				))}
			</svg>
		</div>
	);
}

export default function OpengraphImage() {
	return new ImageResponse(
		<div
			style={{
				position: "relative",
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "72px",
				backgroundColor: BG,
				backgroundImage:
					"radial-gradient(circle at 88% 8%, rgba(248,101,75,0.30), transparent 52%)",
				fontFamily: "sans-serif",
				color: "#fafafa",
			}}
		>
			{/* Inset frame */}
			<div
				style={{
					position: "absolute",
					top: 28,
					left: 28,
					right: 28,
					bottom: 28,
					border: "1px solid rgba(255,255,255,0.08)",
					borderRadius: 28,
				}}
			/>

			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
					<BrandLogo size={78} />
					<div
						style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px" }}
					>
						TRMNL BYOS
					</div>
				</div>
				<div
					style={{
						display: "flex",
						padding: "8px 20px",
						borderRadius: 999,
						border: "1px solid rgba(255,255,255,0.16)",
						color: "#d4d4d8",
						fontSize: 24,
					}}
				>
					Self-hosted
				</div>
			</div>

			{/* Hero */}
			<div style={{ display: "flex", flexDirection: "column" }}>
				<div
					style={{
						display: "flex",
						fontSize: 86,
						fontWeight: 800,
						lineHeight: 1,
						letterSpacing: "-2px",
					}}
				>
					<span>Bring Your Own</span>
					<span style={{ color: BRAND, marginLeft: 26 }}>Server</span>
				</div>
				<div
					style={{
						fontSize: 34,
						color: "#a1a1aa",
						marginTop: 24,
						maxWidth: "880px",
					}}
				>
					Self-hosted device management for TRMNL e-ink displays.
				</div>
			</div>

			{/* Footer */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<div style={{ display: "flex", gap: "12px" }}>
					{["Open source", "Next.js", "Postgres"].map((chip) => (
						<div
							key={chip}
							style={{
								display: "flex",
								padding: "8px 16px",
								borderRadius: 10,
								background: "rgba(255,255,255,0.06)",
								border: "1px solid rgba(255,255,255,0.10)",
								color: "#d4d4d8",
								fontSize: 24,
							}}
						>
							{chip}
						</div>
					))}
				</div>
				<div style={{ fontSize: 26, color: BRAND, fontWeight: 700 }}>
					github.com/usetrmnl/byos_next
				</div>
			</div>
		</div>,
		{ ...size },
	);
}
