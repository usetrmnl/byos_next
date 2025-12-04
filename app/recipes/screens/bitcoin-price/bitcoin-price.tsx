import { Graph } from "@/components/ui/graph";
import { PreSatori } from "@/utils/pre-satori";

interface BitcoinPriceProps {
	price?: string;
	change24h?: string;
	marketCap?: string;
	volume24h?: string;
	lastUpdated?: string;
	high24h?: string;
	low24h?: string;
	historicalPrices?: Array<{ timestamp: number; price: number }>;
	width?: number;
	height?: number;
}

export default function BitcoinPrice({
	price = "Loading...",
	change24h = "0",
	marketCap = "Loading...",
	volume24h = "Loading...",
	lastUpdated = "Loading...",
	high24h = "Loading...",
	low24h = "Loading...",
	historicalPrices = [],
	width = 800,
	height = 480,
}: BitcoinPriceProps) {
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

	return (
		<PreSatori width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white justify-between p-4">
				<div className="flex flex-col">
					<div className="flex items-center justify-between">
						<div className="flex flex-col">
							<h2 className="text-8xl font-inter">${price}</h2>
							<div className="text-4xl font-inter">
								{isPositive ? "↑" : "↓"} {changeValue}%
							</div>
						</div>
						<div className="w-[100px] h-[100px]">
							<picture>
								<source
									srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/64px-Bitcoin.svg.png"
									type="image/png"
								/>
								<img
									src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/64px-Bitcoin.svg.png"
									alt="Bitcoin Logo"
									width={64}
									height={64}
									style={{
										objectFit: "contain",
										width: "100px",
										height: "100px",
										filter:
											"grayscale(100%) brightness(100%) contrast(200%)",
									}}
								/>
							</picture>
						</div>
					</div>
				</div>
				<div className="w-full flex md:flex-row flex-col md:items-center md:justify-between px-4">
					<div className="hidden md:block">
						<Graph data={graphData} isTimeData={true} />
					</div>
					<div className="block md:hidden pb-4">
						<Graph data={graphData} isTimeData={true} width={width - 50} height={300} />
					</div>
					<div className="flex flex-col md:flex-row md:w-1/3 w-full" style={{ gap: "16px" }}>
						{priceStats.map((stat, index) => (
							<div
								key={index}
								className="w-full p-2 rounded-xl border border-black flex flex-row font-geneva9 justify-between"
							>
								<div className="text-[24px] md:text-[28px] leading-none m-0">
									{stat.label}
								</div>
								<div className="text-[24px] md:text-[28px] leading-none m-0">
									${stat.value}
								</div>
							</div>
						))}
					</div>
				</div>
				<div
					className="w-full flex md:flex-row flex-col md:justify-between items-center text-2xl text-black p-2 rounded-xl dither-100"
					style={{ WebkitTextStroke: "4px white" }}
				>
					<div>Bitcoin Price Tracker</div>
					<div>
						{lastUpdated && <span>Last updated: {lastUpdated}</span>}
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
