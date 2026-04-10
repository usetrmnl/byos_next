"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

function useDelayed(active: boolean, ms = 200) {
	const [delayed, setDelayed] = useState(false);
	useEffect(() => {
		if (!active) return setDelayed(false);
		const t = setTimeout(() => setDelayed(true), ms);
		return () => clearTimeout(t);
	}, [active, ms]);
	return delayed;
}

export const ScreenshotImage = ({
	src,
	width,
	height,
	alt,
}: {
	src?: string;
	width: number;
	height: number;
	alt: string;
}) => {
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		setLoaded(false);
	}, [src]);

	const showLoading = useDelayed(!loaded);

	return (
		<div className="relative" style={{ width, height }}>
			{showLoading && (
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
				</div>
			)}
			<img
				src={src}
				width={width}
				height={height}
				loading="lazy"
				style={{ imageRendering: "pixelated", width, height }}
				alt={alt}
				className={clsx("w-full object-cover", showLoading && "invisible")}
				onLoad={() => setLoaded(true)}
			/>
		</div>
	);
};
