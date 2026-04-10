import React from "react";
import clsx from "clsx";

export type ImageFit = "cover" | "contain" | "fill";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	src: string;
	alt?: string;
	width?: number;
	height?: number;
	bitDepth?: 1 | 2 | 4;
	fit?: ImageFit;
	invert?: boolean;
	background?: string;
}

function Image({
	src,
	alt,
	width,
	height,
	bitDepth = 2,
	fit = "contain",
	invert = false,
	background = "white",
	className,
	style,
	...imgProps
}: ImageProps) {
	const params = new URLSearchParams();
	params.set("url", src);
	if (width) params.set("width", width.toString());
	if (height) params.set("height", height.toString());
	params.set("bitdepth", bitDepth.toString());
	params.set("fit", fit);
	params.set("bg", background);
	if (invert) {
		params.set("invert", "true");
	}

	const processedSrc = `/api/image?${params.toString()}`;

	return (
		<img
			src={processedSrc}
			alt={alt}
			width={width}
			height={height}
			className={clsx("image", className)}
			style={{ imageRendering: "pixelated", width, height, ...style }}
			{...imgProps}
		/>
	);
}

export default Image;
