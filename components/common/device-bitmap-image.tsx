import Image from "next/image";

export function DeviceBitmapImage({ src, alt }: { src: string; alt: string }) {
	return (
		<Image
			src={src}
			alt={alt}
			fill
			className="absolute inset-0 h-full w-full object-cover"
			style={{ imageRendering: "pixelated" }}
			unoptimized
		/>
	);
}
