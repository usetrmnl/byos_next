import { Graph } from "@/components/ui/graph";
import { PreSatori } from "@/utils/pre-satori";

interface CryptoPriceProps {
	price?: string;
	change24h?: string;
	marketCap?: string;
	volume24h?: string;
	lastUpdated?: string;
	high24h?: string;
	low24h?: string;
	historicalPrices?: Array<{ timestamp: number; price: number }>;
	cryptoName?: string;
	cryptoImage?: string;
	width?: number;
	height?: number;
}

export default function CryptoPrice({
	price = "Loading...",
	change24h = "0",
	marketCap = "Loading...",
	volume24h = "Loading...",
	lastUpdated = "Loading...",
	high24h = "Loading...",
	low24h = "Loading...",
	historicalPrices = [],
	cryptoName = "Bitcoin",
	cryptoImage,
	width = 800,
	height = 480,
}: CryptoPriceProps) {
	// Calculate if price change is positive or negative
	const isPositive = !change24h.startsWith("-");
	const changeValue = isPositive ? change24h : change24h.substring(1);

	// Pre-generated array for Bitcoin price statistics
	const priceStats = [
		{ label: "Market Cap", value: marketCap },
		{ label: "24h Volume", value: volume24h },
		{ label: "24h High", value: high24h },
		{ label: "24h Low", value: low24h },
	];

	const graphData = historicalPrices.map((d) => ({
		x: new Date(d.timestamp),
		y: d.price,
	}));

	const isHalfScreen = width === 400 && height === 480;

	return (
		<PreSatori width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white justify-between p-4">
				<div className="flex flex-col">
					<div className="flex flex-col">
						<div className="flex items-center justify-between">
							<h2 className="text-6xl sm:text-8xl lg:text-9xl font-inter">
								${price}
							</h2>
							{cryptoImage && (
								<picture>
									{/* YOU CANNOT USE NEXTJS IMAGE COMPONENT HERE, BECAUSE SATORI/TAKUMI DOES NOT SUPPORT IT */}
									<img
										src={cryptoImage}
										alt={`${cryptoName} Logo`}
										width={100}
										height={100}
										className="grayscale w-[100px] h-[100px] lg:w-[200px] lg:h-[200px]"
									/>
								</picture>
							)}
						</div>
						<div className="text-4xl lg:text-5xl font-inter">
							{isPositive ? "↑" : "↓"} {changeValue}%
						</div>
					</div>
				</div>
				<div className="w-full flex flex-col sm:flex-row lg:flex-col  sm:items-center sm:justify-between px-4">
					{!isHalfScreen && (
						<div>
							<div className="hidden sm:flex lg:hidden">
								<Graph data={graphData} isTimeData={true} />
							</div>
							<div className="flex sm:hidden lg:flex pb-4">
								<Graph
									data={graphData}
									isTimeData={true}
									width={width - 60}
									height={height - 500}
								/>
							</div>
						</div>
					)}
					<div className="flex flex-col lg:flex-row w-full gap-4 sm:ml-4">
						{priceStats.map((stat, index) => (
							<div
								key={index}
								className="w-full p-2 lg:p-6 rounded-xl border border-black flex flex-row font-geneva9 justify-between"
							>
								<div className="text-2xl lg:text-5xl leading-none m-0">
									{stat.label}
								</div>
								<div className="text-2xl lg:text-5xl leading-none m-0">
									${stat.value}
								</div>
							</div>
						))}
					</div>
				</div>
				<div className="w-full flex flex-col sm:flex-row sm:justify-between items-center text-2xl lg:text-5xl text-white p-2 rounded-xl bg-gray-500">
					<div>{cryptoName} Price Tracker</div>
					<div>{lastUpdated && <span>Last updated: {lastUpdated}</span>}</div>
				</div>
			</div>
		</PreSatori>
	);
}
