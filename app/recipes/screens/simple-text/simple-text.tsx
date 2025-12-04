import fontData from "@/components/bitmap-font/bitmap-font.json";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";
import { PreSatori } from "@/utils/pre-satori";

export default function SimpleText() {
	return (
		<PreSatori useDoubling={true}>
			{(transform) => (
				<>
					{transform(
						// required as parent cannot access children props, so we need to pass the transform function to the children
						// make a pixle checkerboard of white and black for debug purposes
						<div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center">
							<div className="text-4xl font-blockkie">
								Hello World - blockkie font
							</div>
							<div className="text-base font-geneva9">
								small text with geneva9 font
							</div>
							<div className="text-3xl font-inter">
								Hello World - inter font not anti-aliased
							</div>
							<div className="text-3xl font-blockkie leading-none tracking-tight">
								Hello World - leading none tracking tight
							</div>
							<div className="text-3xl font-blockkie leading-loose tracking-wider">
								Hello World - leading loose tracking wider
							</div>
							<BitmapText
								text={`FT font: Great for headlines`}
								fontData={fontData}
								gridSize={`8x16`}
								scale={2}
								gap={0}
							/>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
