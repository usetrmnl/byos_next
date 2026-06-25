import ftFont from "@/components/bitmap-font/bitmap-font.json";
import genevaFont from "@/components/bitmap-font/generated/geneva.json";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";

const FT_FACE_HEIGHTS = [8, 12, 16] as const;
const GENEVA12_GRID = "0x20";
const GENEVA12_FACE_HEIGHT = 20;

export type BitmapMarkerFont = "ft" | "geneva12";

export type FtMarkerFace = {
	gridSize: string;
	scale: number;
};

/** Pick the FT face + integer scale whose rendered height best matches targetPx. */
export const ftMarkerFace = (targetPx: number): FtMarkerFace => {
	let best: FtMarkerFace & { diff: number } = {
		gridSize: "0x16",
		scale: 1,
		diff: Number.POSITIVE_INFINITY,
	};

	for (const height of FT_FACE_HEIGHTS) {
		const scale = Math.max(1, Math.round(targetPx / height));
		const diff = Math.abs(height * scale - targetPx);
		if (diff < best.diff) {
			best = { gridSize: `0x${height}`, scale, diff };
		}
	}

	return { gridSize: best.gridSize, scale: best.scale };
};

/** Geneva 12 bitmap face (dynamic width, 20px cell height). */
export const geneva12MarkerFace = (targetPx: number): FtMarkerFace => {
	const scale = Math.max(1, Math.round(targetPx / GENEVA12_FACE_HEIGHT));
	return { gridSize: GENEVA12_GRID, scale };
};

/** Scale down vector px targets — bitmap glyphs render taller than equivalent fontSize. */
export const bitmapSizeFromTarget = (
	targetPx: number,
	ratio = 0.65,
	minPx = 10,
): number => Math.max(minPx, Math.round(targetPx * ratio));

export type BitmapMarkerProps = {
	text: string;
	sizePx: number;
	font?: BitmapMarkerFont;
	className?: string;
	gap?: number;
};

export const BitmapMarker = ({
	text,
	sizePx,
	font = "ft",
	className,
	gap = 0,
}: BitmapMarkerProps) => {
	if (font === "geneva12") {
		const { gridSize, scale } = geneva12MarkerFace(sizePx);
		return (
			<BitmapText
				text={text}
				fontData={genevaFont}
				gridSize={gridSize}
				scale={scale}
				gap={gap}
				className={className}
			/>
		);
	}

	const { gridSize, scale } = ftMarkerFace(sizePx);

	return (
		<BitmapText
			text={text}
			fontData={ftFont}
			gridSize={gridSize}
			scale={scale}
			gap={gap}
			className={className}
		/>
	);
};
