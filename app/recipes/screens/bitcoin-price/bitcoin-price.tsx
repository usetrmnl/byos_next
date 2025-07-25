import { PreSatori } from "@/utils/pre-satori";
import { Graph } from '@/components/ui/graph';

// Format price labels
const formatPrice = (price: number) => {
	return `$${Math.round(price).toLocaleString()}`;
};

// Format time labels
const formatTime = (timestamp: number) => {
	const date = new Date(timestamp);
	return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

interface BitcoinPriceProps {
	price?: string;
	change24h?: string;
	marketCap?: string;
	volume24h?: string;
	lastUpdated?: string;
	high24h?: string;
	low24h?: string;
	historicalPrices?: Array<{ timestamp: number; price: number }>;
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

	const graphData = historicalPrices.map(d => ({
		x: new Date(d.timestamp),
		y: d.price
	}));

	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px] bg-white justify-between p-4">
							<div className="flex flex-col">
								<div className="flex items-center justify-between">
									<div className="flex flex-col">
										<h2 className="text-8xl font-inter">${price}</h2>
										<div className="text-4xl">
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
							<div className="w-full flex flex-row items-center justify-between px-4">
								<Graph
									data={graphData}
									isTimeData={true}
								/>
								<div
									className="flex flex-col w-1/3"
									style={{ gap: "16px" }}
								>
									{priceStats.map((stat, index) => (
										<div
											key={index}
											className="p-2 rounded-xl border border-black flex flex-row font-geneva9 justify-between"
										>
											<div className="text-[28px] leading-none m-0">
												{stat.label}
											</div>
											<div className="text-[28px] leading-none m-0">
												${stat.value}
											</div>
										</div>
									))}
								</div>
							</div>
							<div
								className="w-full flex justify-between text-2xl p-2 rounded-xl dither-100"
								style={{ WebkitTextStroke: "4px white" }}
							>
								<div>Bitcoin Price Tracker</div>
								<div>{lastUpdated && <span>Last updated: {lastUpdated}</span>}</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
