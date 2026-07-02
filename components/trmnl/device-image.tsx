import type { ImageDitherMethod } from "@/lib/recipes/types";
import type { ScreenProfile } from "@/lib/trmnl/screen-profile";

export type DeviceImageProps = {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
	style?: React.CSSProperties;
	/** Dithering algorithm when the render pipeline prepares this image for device. */
	method?: ImageDitherMethod;
};

/**
 * Device-aware image for recipes. The server render pipeline rewrites `<img>`
 * tags before Takumi compose; this component documents author intent and keeps
 * a consistent prop surface for `method` selection (default Bayer).
 */
export const DeviceImage = ({
	src,
	alt,
	width,
	height,
	className,
	style,
	method: _method = "bayer",
}: DeviceImageProps) => {
	return (
		// biome-ignore lint/performance/noImgElement: recipe output is rasterized server-side
		<img
			src={src}
			alt={alt}
			width={width}
			height={height}
			className={className}
			style={style}
			data-byos-image-dither={_method}
		/>
	);
};

export const isBitmapOnlyScreen = (screen: ScreenProfile): boolean =>
	!screen.supportsColor && screen.bitDepth <= 1;
