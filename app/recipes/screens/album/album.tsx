import { PreSatori } from "@/utils/pre-satori";

export default async function Album() {
	"use cache";
	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						// required as parent cannot access children props, so we need to pass the transform function to the children
						<div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center relative">
							<picture className="w-full h-full absolute inset-0">
								<source
									srcSet={`https://byos-nextjs.vercel.app/album/london.png`}
									type="image/png"
								/>
								<img
									src={`https://byos-nextjs.vercel.app/album/london.png`}
									alt="Album 1"
									width={800}
									height={480}
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
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
