import { unstable_cache } from "next/cache";

// Export config to mark this component as dynamic
export const dynamic = "force-dynamic";

interface BitcoinData {
	price: string;
	change24h: string;
	marketCap: string;
	volume24h: string;
	lastUpdated: string;
	high24h: string;
	low24h: string;
}

/**
 * Internal function to fetch and process Bitcoin price data
 */
async function getBitcoinData(): Promise<BitcoinData | null> {
	try {
		// Fetch Bitcoin data from CoinGecko API
		const response = await fetch(
			"https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false",
			{
				headers: {
					Accept: "application/json",
					"Accept-Language": "en-US",
				},
				next: { revalidate: 0 }, // Updated from cache: "no-store"
			},
		);

		if (!response.ok) {
			throw new Error(
				`CoinGecko API responded with status: ${response.status}`,
			);
		}

		const data = await response.json();

		// Format the data
		const formatCurrency = (value: number): string => {
			return new Intl.NumberFormat("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(value);
		};

		const formatLargeNumber = (value: number): string => {
			if (value >= 1e12) {
				return `${(value / 1e12).toFixed(2)}T`;
			}

			if (value >= 1e9) {
				return `${(value / 1e9).toFixed(2)}B`;
			}

			if (value >= 1e6) {
				return `${(value / 1e6).toFixed(2)}M`;
			}

			return formatCurrency(value);
		};

		// Format the date
		const formatDate = (dateString: string): string => {
			const date = new Date(dateString);
			return date.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		};

		// Check if we have valid market data
		if (!data.market_data) {
			throw new Error("No market data available");
		}

		return {
			price: formatCurrency(data.market_data.current_price.usd),
			change24h: data.market_data.price_change_percentage_24h.toFixed(2),
			marketCap: formatLargeNumber(data.market_data.market_cap.usd),
			volume24h: formatLargeNumber(data.market_data.total_volume.usd),
			lastUpdated: formatDate(data.last_updated),
			high24h: formatCurrency(data.market_data.high_24h.usd),
			low24h: formatCurrency(data.market_data.low_24h.usd),
		};
	} catch (error) {
		console.error("Error fetching Bitcoin data:", error);
		return null;
	}
}

/**
 * Function that fetches Bitcoin data without caching
 */
async function fetchBitcoinDataNoCache(): Promise<BitcoinData> {
	const data = await getBitcoinData();

	// If data is null or empty, return a default object
	if (!data) {
		return {
			price: "N/A",
			change24h: "0.00",
			marketCap: "N/A",
			volume24h: "N/A",
			lastUpdated: "N/A",
			high24h: "N/A",
			low24h: "N/A",
		};
	}

	return data;
}

/**
 * Cached function that serves as the entry point for fetching Bitcoin data
 * Only caches valid responses
 */
const getCachedBitcoinData = unstable_cache(
	async (): Promise<BitcoinData> => {
		const data = await getBitcoinData();

		// If data is null or empty, throw an error to prevent caching
		if (!data) {
			throw new Error("Empty or invalid data - skip caching");
		}

		return data;
	},
	["bitcoin-price-data"],
	{
		tags: ["bitcoin", "cryptocurrency"],
		revalidate: 300, // Cache for 5 minutes
	},
);

/**
 * Main export function that tries to use cached data but falls back to non-cached data if needed
 */
export default async function getData(): Promise<BitcoinData> {
	try {
		// Try to get cached data first
		return await getCachedBitcoinData();
	} catch (error) {
		console.log("Cache skipped or error:", error);
		// Fall back to non-cached data
		return fetchBitcoinDataNoCache();
	}
}
