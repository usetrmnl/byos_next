import { PreSatori } from "@/utils/pre-satori";
import { BitmapText } from "@/components/bitmap-font/bitmap-text";
import fontData from "@/components/bitmap-font/bitmap-font-8x8.json";

export default function SimpleText() {
	return (
		<PreSatori useDoubling={true}>
			{(transform) => (
				<>
					{transform(
						// required as parent cannot access children props, so we need to pass the transform function to the children
						// make a pixle checkerboard of white and black for debug purposes
						<div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center">
							<div 
								className="text-4xl font-blockkie"
							>
								Hello World - blockkie font
							</div>
							<div 
								className="text-base font-geneva9" 
							>
								small text with geneva9 font
							</div>
							<BitmapText fontData={fontData} text="Mate this is pretty incredible isn't it?" />
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
