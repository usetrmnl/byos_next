export const dynamic = "force-static";

export default function NotFound() {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<p className="hidden">
				404 not found. the page you are looking for does not exist.
			</p>
			{/* biome-ignore lint/performance/noImgElement: indexed PNG; next/image optimizer returns null */}
			<img
				src="/not-found.png"
				alt="404"
				width={200}
				height={120}
				className="dark:invert"
				style={{ imageRendering: "pixelated" }}
			/>
		</div>
	);
}
