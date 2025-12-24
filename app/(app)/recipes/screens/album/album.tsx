import { PreSatori } from "@/utils/pre-satori";

interface AlbumProps {
	width?: number;
	height?: number;
	params?: {
		imageUrl?: string;
	};
}

export default async function Album({
	width = 800,
	height = 480,
	params,
}: AlbumProps) {
	const imageUrl =
		params?.imageUrl || "https://byos-nextjs.vercel.app/album/london.png";

	return (
		<PreSatori width={width} height={height}>
			<div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
				<picture className="w-full h-full absolute inset-0">
					<source srcSet={imageUrl} type="image/png" />
					<img
						src={imageUrl}
						alt="Album"
						width={width}
						height={height}
						className="w-full h-full object-cover"
						style={{ imageRendering: "pixelated" }}
					/>
				</picture>
				<div className="text-[60px] text-white absolute top-0 right-0 p-4 flex flex-col items-end leading-none">
					<span className="">
						{new Date().toLocaleTimeString("en-GB", {
							timeZone: "Europe/London",
							hour12: true,
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
					<span className="">
						London{" "}
						{new Date()
							.toLocaleString("en-GB", {
								timeZone: "Europe/London",
								timeZoneName: "short",
							})
							.split(" ")
							.pop()}
					</span>
				</div>
			</div>
		</PreSatori>
	);
}
