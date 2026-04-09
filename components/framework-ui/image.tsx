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
	bitDepth,
	fit = "contain",
	invert = false,
	background = "white",
	className,
	...imgProps
}: ImageProps) {
	// If no bitDepth is specified, render the image directly without processing
	if (!bitDepth) {
		return (
			<img
				src={src}
				alt={alt}
				className={clsx("image", className)}
				{...imgProps}
			/>
		);
	}

	// Build the API URL for processed image
	const params = new URLSearchParams();
	params.set("url", src);

	if (width) {
		params.set("w", width.toString());
	}
	if (height) {
		params.set("h", height.toString());
	}
	params.set("bit", bitDepth.toString());
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
			{...imgProps}
		/>
	);
}

export default Image;
