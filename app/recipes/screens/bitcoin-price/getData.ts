import { unstable_cache } from "next/cache";

// Export config to mark this component as dynamic
export const dynamic = "force-dynamic";

interface CryptoParams {
	cryptoSymbol?: string;
}

interface CryptoData {
	price: string;
	change24h: string;
	marketCap: string;
	volume24h: string;
	lastUpdated: string;
	high24h: string;
	low24h: string;
	historicalPrices: Array<{ timestamp: number; price: number }>;
	cryptoName: string;
	cryptoImage?: string;
}

/**
 * Internal function to fetch historical crypto price data
 */
async function getCryptoHistoricalData(cryptoSymbol: string): Promise<Array<{
	timestamp: number;
	price: number;
}> | null> {
	try {
		// Fetch historical crypto data from CoinGecko API
		const response = await fetch(
			`https://api.coingecko.com/api/v3/coins/${cryptoSymbol}/market_chart?vs_currency=usd&days=1`,
			{
				headers: {
					Accept: "application/json",
					"Accept-Language": "en-US",
				},
				next: { revalidate: 0 },
			},
		);

		if (!response.ok) {
			throw new Error(
				`CoinGecko API responded with status: ${response.status}`,
			);
		}

		const data = await response.json();

		// Return the prices array which contains [timestamp, price] pairs
		return data.prices.map(([timestamp, price]: [number, number]) => ({
			timestamp,
			price,
		}));
	} catch (error) {
		console.error(`Error fetching ${cryptoSymbol} historical data:`, error);
		return null;
	}
}

/**
 * Internal function to fetch and process crypto price data
 */
async function getCryptoData(cryptoSymbol: string): Promise<CryptoData | null> {
	try {
		// Fetch both current and historical data in parallel
		const [currentDataResponse, historicalPrices] = await Promise.all([
			fetch(
				`https://api.coingecko.com/api/v3/coins/${cryptoSymbol}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
				{
					headers: {
						Accept: "application/json",
						"Accept-Language": "en-US",
					},
					next: { revalidate: 0 },
				},
			),
			getCryptoHistoricalData(cryptoSymbol),
		]);

		if (!currentDataResponse.ok) {
			throw new Error(
				`CoinGecko API responded with status: ${currentDataResponse.status}`,
			);
		}

		const data = await currentDataResponse.json();

		// Format the data
		const formatCurrency = (value: number): string => {
			return new Intl.NumberFormat("en-US", {
				minimumFractionDigits: 0,
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
			historicalPrices: historicalPrices || [],
			cryptoName: data.name || cryptoSymbol,
			cryptoImage: data.image?.small || data.image?.large,
		};
	} catch (error) {
		console.error(`Error fetching ${cryptoSymbol} data:`, error);
		return null;
	}
}

/**
 * Function that fetches crypto data without caching
 */
async function fetchCryptoDataNoCache(
	cryptoSymbol: string,
): Promise<CryptoData> {
	const data = await getCryptoData(cryptoSymbol);

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
			historicalPrices: [],
			cryptoName: cryptoSymbol,
		};
	}

	return data;
}

/**
 * Helper function to create a cached function for a specific crypto symbol
 * This ensures each crypto has its own cache entry
 */
function createCachedCryptoData(cryptoSymbol: string) {
	return unstable_cache(
		async (): Promise<CryptoData> => {
			const data = await getCryptoData(cryptoSymbol);

			// If data is null or empty, throw an error to prevent caching
			if (!data) {
				throw new Error("Empty or invalid data - skip caching");
			}

			return data;
		},
		["crypto-price-data", cryptoSymbol],
		{
			tags: ["cryptocurrency", cryptoSymbol],
			revalidate: 300, // Cache for 5 minutes
		},
	);
}

/**
 * Main export function that tries to use cached data but falls back to non-cached data if needed
 */
export default async function getData(
	params?: CryptoParams,
): Promise<CryptoData> {
	const cryptoSymbol = params?.cryptoSymbol || "bitcoin";

	try {
		// Try to get cached data first
		const cachedFunction = createCachedCryptoData(cryptoSymbol);
		return await cachedFunction();
	} catch (error) {
		console.log("Cache skipped or error:", error);
		// Fall back to non-cached data
		return fetchCryptoDataNoCache(cryptoSymbol);
	}
}
