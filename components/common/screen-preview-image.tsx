"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ScreenPreviewImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	loading?: "eager" | "lazy";
	fetchPriority?: "high" | "low" | "auto";
	className?: string;
}

export function ScreenPreviewImage({
	src,
	alt,
	width,
	height,
	loading = "lazy",
	fetchPriority = "auto",
	className,
}: ScreenPreviewImageProps) {
	const imgRef = useRef<HTMLImageElement>(null);
	const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
	const isLoading = loadedSrc !== src;

	useEffect(() => {
		const image = imgRef.current;
		if (image?.complete) {
			setLoadedSrc(src);
		}
	}, [src]);

	return (
		<>
			{isLoading && (
				<Skeleton
					aria-hidden
					className="absolute inset-0 h-full w-full rounded-none bg-neutral-300 dark:bg-neutral-700"
				/>
			)}
			{/* biome-ignore lint/performance/noImgElement: 1-bit bitmaps must stay pixelated and are already served at preview size */}
			<img
				ref={imgRef}
				key={src}
				src={src}
				alt={alt}
				width={width}
				height={height}
				loading={loading}
				fetchPriority={fetchPriority}
				decoding="async"
				className={cn(
					"h-full w-full object-cover transition-opacity duration-150",
					isLoading ? "opacity-0" : "opacity-100",
					className,
				)}
				style={{ imageRendering: "pixelated" }}
				onLoad={() => setLoadedSrc(src)}
				onError={() => setLoadedSrc(src)}
			/>
		</>
	);
}
