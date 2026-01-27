import { PreSatori } from "@/utils/pre-satori";

interface ResponsiveExampleProps {
	width?: number;
	height?: number;
}

export default function ResponsiveExample({
	width = 800,
	height = 480,
}: ResponsiveExampleProps) {
	return (
		<PreSatori useDoubling={false} width={width} height={height}>
			<div className="bg-white flex flex-col w-full h-full">
				{/* Header section - responsive height and text size */}
				<div className="bg-blue-500 flex items-center justify-center text-white font-blockkie py-5 text-2xl sm:text-3xl lg:text-4xl">
					<p>Responsive Header</p>
				</div>

				{/* Main content area - responsive layout */}
				{/* Wide screens: side by side, Narrow screens: stacked */}
				<div className="flex-1 flex flex-col md:flex-row gap-1 sm:gap-2 p-1 sm:p-2">
					{/* Wide layout: side by side panels */}
					<div className="bg-red-500 flex items-center justify-center text-white font-blockkie rounded-sm flex-1 text-lg sm:text-xl lg:text-2xl">
						<span className="md:hidden">Top Panel</span>
						<span className="hidden md:inline">Left Panel</span>
					</div>
					<div className="bg-green-500 flex items-center justify-center text-white font-blockkie rounded-sm flex-1 text-lg sm:text-xl lg:text-2xl">
						<span className="md:hidden">Bottom Panel</span>
						<span className="hidden md:inline">Right Panel</span>
					</div>
				</div>

				{/* Footer section - responsive height and text size */}
				<div className="bg-purple-500 flex items-center justify-center text-white font-blockkie h-20 text-base sm:text-xl lg:text-2xl">
					<p>
						Footer - {width}x{height}
					</p>
				</div>
			</div>
		</PreSatori>
	);
}
