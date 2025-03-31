import Image from "next/image";

export const dynamic = "force-static";

export default function NotFound() {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<p aria-label="404" className="hidden">
				404 not found. the page you are looking for does not exist.
			</p>
			<Image
				src="/not-found.png"
				alt="404"
				width={800}
				height={480}
				className="dark:invert"
				style={{ imageRendering: "pixelated" }}
			/>
		</div>
	);
}
