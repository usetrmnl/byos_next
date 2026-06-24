import { z } from "zod";
import { Graph } from "@/components/common/graph";
import {
	MIN_SCREEN_BODY_FONT_SIZE,
	MIN_SCREEN_STAT_LABEL_FONT_SIZE,
	ScreenCanvas,
	ScreenFooter,
	StatsGrid,
	screenFontSize,
	screenMetric,
} from "@/components/trmnl/screen-layout";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { RecipeDefinition } from "@/lib/recipes/types";
import {
	createScreenProfile,
	type ScreenProfile,
} from "@/lib/trmnl/screen-profile";
import { PreSatori } from "@/utils/pre-satori";
import getCryptoData from "./getData";

export const paramsSchema = z.object({
	cryptoSymbol: z
		.string()
		.default("bitcoin")
		.describe(
			"The CoinGecko ID of the cryptocurrency (e.g., 'bitcoin', 'ethereum', 'cardano').",
		)
		.meta({ title: "Cryptocurrency Symbol", placeholder: "bitcoin" }),
});

export const dataSchema = z.object({
	price: z.string().default("Loading..."),
	change24h: z.string().default("0"),
	marketCap: z.string().default("Loading..."),
	volume24h: z.string().default("Loading..."),
	lastUpdated: z.string().default("Loading..."),
	high24h: z.string().default("Loading..."),
	low24h: z.string().default("Loading..."),
	historicalPrices: z
		.array(z.object({ timestamp: z.number(), price: z.number() }))
		.default([]),
	cryptoName: z.string().default("Bitcoin"),
	cryptoImage: z.string().optional(),
});

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
	screen?: ScreenProfile;
}

/** Prefix a `$` only when the value is a real number string. */
function displayCurrency(value: string): string {
	if (value === "Loading..." || value === "N/A") return value;
	return value.startsWith("$") ? value : `$${value}`;
}

/** Compact axis price: 62000 -> "$62k". */
function formatAxisPrice(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
	if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
	if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`;
	return `$${Math.round(value)}`;
}

/** Compact axis time: 18:00 -> "6p". */
function formatAxisTime(value: number | Date): string {
	const date = value instanceof Date ? value : new Date(value);
	return date
		.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })
		.replace(" AM", "a")
		.replace(" PM", "p");
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
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	screen,
}: CryptoPriceProps) {
	const screenProfile = screen ?? createScreenProfile({ width, height });
	const isPositive = !change24h.startsWith("-");
	const changeValue = isPositive ? change24h : change24h.substring(1);

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

	const showGraph = screenProfile.logicalHeight >= 420 && graphData.length > 1;

	const pad = screenMetric(screenProfile, screenProfile.isCompact ? 14 : 22);
	const gap = screenMetric(screenProfile, screenProfile.isCompact ? 8 : 12);
	const statColumns =
		screenProfile.isHalfScreen || screenProfile.orientation === "portrait"
			? 2
			: 4;
	const statRows = Math.ceil(priceStats.length / statColumns);
	const footerHeight = screenMetric(
		screenProfile,
		screenProfile.isCompact ? 34 : 42,
	);
	const headerHeight = screenMetric(
		screenProfile,
		screenProfile.isHalfScreen ? 86 : screenProfile.isLarge ? 120 : 104,
	);
	const statRowHeight = screenMetric(
		screenProfile,
		screenProfile.isCompact ? 58 : 70,
	);
	const statsHeight = statRows * statRowHeight + (statRows - 1) * gap;
	const availableGraphHeight =
		screenProfile.logicalHeight -
		pad * 2 -
		headerHeight -
		statsHeight -
		footerHeight -
		gap * 3;
	const graphWidth = Math.max(220, screenProfile.logicalWidth - pad * 2);
	const graphHeight = Math.max(
		screenMetric(screenProfile, 130),
		availableGraphHeight,
	);
	const axisFontSize = screenFontSize(
		screenProfile,
		screenProfile.isCompact ? 14 : 18,
		MIN_SCREEN_BODY_FONT_SIZE,
	);
	const graphMargin = {
		top: screenMetric(screenProfile, 8),
		right: screenMetric(screenProfile, 14),
		bottom: Math.round(axisFontSize * 1.8),
		left: screenMetric(screenProfile, screenProfile.isCompact ? 54 : 66),
	};

	const logoSize = screenMetric(screenProfile, screenProfile.isLarge ? 64 : 48);
	const priceSize = screenMetric(
		screenProfile,
		screenProfile.isHalfScreen ? 44 : screenProfile.isLarge ? 76 : 64,
	);
	const changeSize = screenMetric(
		screenProfile,
		screenProfile.isHalfScreen ? 18 : screenProfile.isLarge ? 30 : 24,
	);
	const statLabelSize = screenFontSize(
		screenProfile,
		!showGraph ? 18 : screenProfile.isCompact ? 16 : 17,
		MIN_SCREEN_STAT_LABEL_FONT_SIZE,
	);
	const statValueSize = screenFontSize(
		screenProfile,
		!showGraph ? 26 : screenProfile.isCompact ? 18 : 22,
		MIN_SCREEN_BODY_FONT_SIZE,
	);

	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<ScreenCanvas screen={screenProfile} style={{ padding: pad, gap }}>
				<div
					className="flex flex-none flex-row items-start justify-between border-b border-black"
					style={{ height: headerHeight, paddingBottom: gap }}
				>
					<div className="flex min-w-0 flex-col">
						<div
							className="font-inter tracking-tight"
							style={{ fontSize: priceSize, lineHeight: 0.86 }}
						>
							{displayCurrency(price)}
						</div>
						<div
							className="font-inter"
							style={{
								fontSize: changeSize,
								lineHeight: 1,
								marginTop: screenMetric(screenProfile, 6),
							}}
						>
							{isPositive ? "Up" : "Down"} {changeValue}%
						</div>
					</div>

					<div
						className="flex flex-none flex-col items-end font-geneva9 uppercase"
						style={{
							gap: screenMetric(screenProfile, 6),
							fontSize: screenFontSize(
								screenProfile,
								screenProfile.isCompact ? 10 : 13,
							),
							letterSpacing: "0.08em",
						}}
					>
						{cryptoImage ? (
							<picture>
								{/* Satori/Takumi do not support the Next.js Image component. */}
								<img
									src={cryptoImage}
									alt={`${cryptoName} logo`}
									width={logoSize}
									height={logoSize}
									className="grayscale"
									style={{ width: logoSize, height: logoSize }}
								/>
							</picture>
						) : null}
					</div>
				</div>

				{showGraph && (
					<div
						className="flex flex-none items-center justify-center overflow-hidden"
						style={{ height: graphHeight }}
					>
						<Graph
							data={graphData}
							isTimeData={true}
							width={graphWidth}
							height={graphHeight}
							margin={graphMargin}
							xTicks={4}
							yTicks={4}
							xAxisFormat={formatAxisTime}
							yAxisFormat={formatAxisPrice}
							axisFontSize={axisFontSize}
							lineWidth={screenMetric(
								screenProfile,
								screenProfile.isLarge ? 3 : 2,
							)}
							curveType="monotone"
						/>
					</div>
				)}

				<StatsGrid
					screen={screenProfile}
					stats={priceStats.map((stat) => ({
						label: stat.label,
						value: displayCurrency(stat.value),
					}))}
					columns={statColumns}
					fill={!showGraph}
					gapSize={gap}
					rowHeight={showGraph ? statRowHeight : undefined}
					labelSize={statLabelSize}
					valueSize={statValueSize}
				/>

				<ScreenFooter
					screen={screenProfile}
					left={`${cryptoName} price tracker`}
					right={lastUpdated ? `Updated ${lastUpdated}` : ""}
					style={{ height: footerHeight }}
				/>
			</ScreenCanvas>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<
	typeof paramsSchema,
	typeof dataSchema
> = {
	meta: {
		slug: "bitcoin-price",
		title: "Crypto Price Tracker",
		description:
			"A component that displays the current cryptocurrency price and market data. Supports any cryptocurrency available on CoinGecko.",
		published: true,
		tags: ["tailwind", "cryptocurrency", "api", "configurable"],
		author: { name: "Mangle Kuo", github: "ghcpuman902" },
		category: "display-components",
		version: "0.2.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
	},
	paramsSchema,
	dataSchema,
	getData: async (params) => {
		const data = await getCryptoData({ cryptoSymbol: params.cryptoSymbol });
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, screen, data }) => (
		<CryptoPrice {...data} width={width} height={height} screen={screen} />
	),
};
