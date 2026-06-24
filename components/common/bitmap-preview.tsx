import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import { buildBitmapPreviewSrc } from "@/lib/render/preview-image";
import { cn } from "@/lib/utils";

interface BitmapPreviewProps {
	/** Bitmap route path: a recipe slug (e.g. "weather") or `mixup/<id>`. */
	path: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
}

/**
 * A 1-bit screen/mixup preview rendered at default resolution. Centralizes the
 * `/api/bitmap/...` URL and pixelated rendering shared by the playlist
 * filmstrip, reel card, live preview, and mixup list. Callers add positioning
 * (e.g. `absolute inset-0`) via `className`.
 */
export function BitmapPreview({
	path,
	alt,
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	className,
}: BitmapPreviewProps) {
	return (
		// biome-ignore lint/performance/noImgElement: 1-bit bitmaps must stay pixelated; next/image would recompress/optimize them and break the e-ink preview
		<img
			src={buildBitmapPreviewSrc(path, { width, height })}
			alt={alt}
			width={width}
			height={height}
			className={cn("h-full w-full object-cover", className)}
			style={{ imageRendering: "pixelated" }}
		/>
	);
}
