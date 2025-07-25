import { unstable_cache } from "next/cache";

// Export config to mark this component as dynamic
export const dynamic = "force-dynamic";

// Reservoir cache for storing multiple articles
interface ReservoirCache {
	articles: WikipediaData[];
	lastUpdated: number;
	lastApiSuccess: boolean;
	consecutiveFailures: number;
}

// Global reservoir cache (only in development or when forced)
declare global {
	// eslint-disable-next-line no-var
	var wikipediaReservoir: ReservoirCache | undefined;
}

// Initialize or get the reservoir cache
const getReservoirCache = (): ReservoirCache | null => {
	// Check for forced cache usage via environment variable
	const forceReservoirCache = process.env.FORCE_WIKIPEDIA_RESERVOIR === "true";

	// In production, return null unless forced
	if (process.env.NODE_ENV === "production" && !forceReservoirCache) {
		return null;
	}

	// Use global cache in development or when forced in production
	if (!global.wikipediaReservoir) {
		global.wikipediaReservoir = {
			articles: [],
			lastUpdated: 0,
			lastApiSuccess: false,
			consecutiveFailures: 0,
		};
		console.log("Initializing Wikipedia reservoir cache");
	}
	return global.wikipediaReservoir;
};

// Reservoir management functions
const RESERVOIR_SIZE = 5; // Store 5 articles
const RESERVOIR_TTL = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_PERIOD = 2 * 60 * 1000; // 2 minutes after consecutive failures

const addToReservoir = (article: WikipediaData) => {
	const reservoir = getReservoirCache();
	if (!reservoir) return;

	// Add to reservoir, maintaining size limit
	reservoir.articles.push(article);
	if (reservoir.articles.length > RESERVOIR_SIZE) {
		reservoir.articles.shift(); // Remove oldest
	}
	reservoir.lastUpdated = Date.now();
	reservoir.lastApiSuccess = true;
	reservoir.consecutiveFailures = 0; // Reset failure counter on success

	console.log(
		`Added article to reservoir: "${article.title}" (${reservoir.articles.length}/${RESERVOIR_SIZE})`,
	);
};

const getFromReservoir = (): WikipediaData | null => {
	const reservoir = getReservoirCache();
	if (!reservoir || reservoir.articles.length === 0) {
		return null;
	}

	// Check if reservoir is still fresh
	const now = Date.now();
	if (now - reservoir.lastUpdated > RESERVOIR_TTL) {
		console.log("Reservoir expired, will refresh on next API call");
		return null;
	}

	// Check if we're in cooldown period after consecutive failures
	if (
		reservoir.consecutiveFailures > 2 &&
		now - reservoir.lastUpdated < COOLDOWN_PERIOD
	) {
		console.log("In cooldown period, using reservoir");
	}

	// Return a random article from the reservoir
	const randomIndex = Math.floor(Math.random() * reservoir.articles.length);
	const article = reservoir.articles[randomIndex];
	console.log(`Using article from reservoir: "${article.title}"`);
	return article;
};

const markApiFailure = () => {
	const reservoir = getReservoirCache();
	if (!reservoir) return;

	reservoir.lastApiSuccess = false;
	reservoir.consecutiveFailures++;
	console.log(
		`API failure marked. Consecutive failures: ${reservoir.consecutiveFailures}`,
	);
};

const shouldUseReservoir = (): boolean => {
	const reservoir = getReservoirCache();
	if (!reservoir) return false;

	// Use reservoir if:
	// 1. We have articles in reservoir
	// 2. AND reservoir is fresh (for immediate response, but still attempt API)
	const now = Date.now();
	const reservoirFresh = now - reservoir.lastUpdated < RESERVOIR_TTL;

	// Always allow reservoir use if we have articles and they're fresh
	// The main function will decide whether to bypass API or not
	return reservoir.articles.length > 0 && reservoirFresh;
};

export interface WikipediaData {
	title: string;
	extract: string;
	thumbnail?: {
		source?: string;
		width?: number;
		height?: number;
	};
	content_urls?: {
		desktop: {
			page: string;
		};
	};
	// Essential fields from the API
	pageid?: number;
	fullurl?: string;
	canonicalurl?: string;
	displaytitle?: string;
	description?: string;

	// Optional fields that may be useful
	ns?: number;
	contentmodel?: string;
	pagelanguage?: string;
	pagelanguagedir?: string;
	touched?: string;
	lastrevid?: number;
	length?: number;
	editurl?: string;

	// Additional fields still needed by existing code
	type?: string;
	categories?: string[];
}

// Default fallback data to use when all fetching attempts fail
const DEFAULT_FALLBACK_DATA: WikipediaData = {
	pageid: 1234567,
	ns: 0,
	title: sanitizeRtlText("Electronic Paper Display"),
	extract: sanitizeRtlText(
		"Electronic paper, also sometimes called e-paper, is a display technology designed to mimic the appearance of ordinary ink on paper. Unlike conventional flat panel displays that emit light, electronic paper displays reflect light like paper. This may make them more comfortable to read, and provide a wider viewing angle than most light-emitting displays.",
	),
	thumbnail: {
		source:
			"https://upload.wikimedia.org/wikipedia/commons/1/1a/Reading_a_kindle_on_public_transit.jpg",
		width: 320,
		height: 240,
	},
	contentmodel: "wikitext",
	pagelanguage: "en",
	pagelanguagedir: "ltr",
	touched: "2025-03-06T03:31:30Z",
	lastrevid: 1234567890,
	length: 12345,
	fullurl: "https://en.wikipedia.org/wiki/Electronic_paper",
	editurl:
		"https://en.wikipedia.org/w/index.php?title=Electronic_paper&action=edit",
	canonicalurl: "https://en.wikipedia.org/wiki/Electronic_paper",
	displaytitle: sanitizeRtlText("Electronic Paper Display"),
	description: sanitizeRtlText(
		"Display technology that mimics the appearance of ink on paper",
	),
	content_urls: {
		desktop: {
			page: "https://en.wikipedia.org/wiki/Electronic_paper",
		},
	},
	categories: ["Display technology", "Electronic paper technology"],
	type: "standard",
};

/**
 * Helper function to get a random fallback article
 */
function getRandomFallbackArticleTitle(): string {
	// Curated list of non-disambiguation articles that are reliable and informative
	const fallbackArticles = [
		"Electronic_paper",
		"Internet_of_things",
		"Computer_terminal",
		"London_Underground",
		"Wikipedia",
		"Raspberry_Pi",
		"E-ink",
		"Kindle_(Amazon)", // Specified to avoid disambiguation
		"Digital_display",
		"Smart_home",
		"Artificial_intelligence",
		"Cloud_computing",
		"Quantum_computing",
		"Virtual_reality",
		"Augmented_reality",
	];
	return fallbackArticles[Math.floor(Math.random() * fallbackArticles.length)];
}

/**
 * Helper function to implement fetch with timeout and retry logic
 * Using shorter timeouts (3 seconds) as requested
 */
async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retries = 2, // Reduced to only 2 retries max
	timeout = 3000, // Reduced to 3 seconds as requested
): Promise<Response> {
	// Create an AbortController to handle timeouts
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		// Add authentication token if available
		const headers = new Headers(options.headers || {});

		// Add Authorization header with bearer token if WIKIPEDIA_ACCESS_TOKEN is available
		const accessToken = process.env.WIKIPEDIA_ACCESS_TOKEN;
		if (accessToken) {
			headers.set("Authorization", `Bearer ${accessToken}`);
			console.log("Using Wikipedia access token for authentication");
		} else {
			console.log(
				"No Wikipedia access token found, proceeding without authentication",
			);
		}

		// Add the signal to the options
		const fetchOptions = {
			...options,
			headers,
			signal: controller.signal,
			// Remove the cache: "no-store" option and use next: { revalidate: 0 } instead
			next: { revalidate: 0 },
		};

		// Attempt the fetch
		const response = await fetch(url, fetchOptions);
		clearTimeout(timeoutId);

		// Log response status to help with debugging
		console.log(
			`Fetch response for ${new URL(url).pathname}: Status ${response.status} ${response.statusText}`,
		);

		return response;
	} catch (error) {
		clearTimeout(timeoutId);

		// Specifically identify abort errors
		const isAbortError =
			error instanceof Error &&
			(error.name === "AbortError" ||
				(error as DOMException).code === 20 ||
				error.message.includes("abort"));

		// Enhanced error logging
		if (isAbortError) {
			console.error(
				`Request timed out after ${timeout}ms for: ${new URL(url).pathname}`,
			);
		} else {
			console.error(`Fetch error for ${new URL(url).pathname}:`, {
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}

		// If we have retries left, wait a short time and try again
		// Using same timeout for all retries as requested
		if (retries > 0) {
			// Short backoff with consistent timeout
			const delay = 1000; // 1 second delay between retries
			console.warn(
				`Fetch ${isAbortError ? "timeout" : "error"} for URL: ${new URL(url).pathname}. Retries left: ${retries}`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
			return fetchWithRetry(url, options, retries - 1, timeout);
		}

		// When all retries are exhausted, log and re-throw a more informative error
		if (isAbortError) {
			console.error(`Request timed out for URL: ${url} after all retries`);
			// Create a new error that doesn't have the complex properties that might cause serialization issues
			throw new Error(
				`Request timed out for URL: ${url} after ${3 - retries} attempts`,
			);
		}

		// For other types of errors
		console.error(`Fetch error for URL: ${url} after all retries:`, error);
		throw error;
	}
}

/**
 * Fetch multiple random articles with their extracts and images in a single request
 * This uses the generator=random with prop=pageimages|extracts for efficiency
 */
async function fetchRandomArticles(count = 10): Promise<WikipediaData[]> {
	try {
		// Use the optimized endpoint that combines random article generation with content fetching
		// This gets random articles with their extracts and images in a single request
		// Increased count from 5 to 10 to improve chances of finding suitable articles
		const headers = new Headers({
			"User-Agent": "trmnl-byos-nextjs (ghcpuman902@gmail.com)",
		});

		const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=random&grnnamespace=0&grnlimit=${count}&prop=pageimages|extracts|categories|info&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=300&inprop=url|displaytitle&format=json&origin=*`;

		console.log(`Fetching random articles from: ${apiUrl}`);

		const response = await fetchWithRetry(apiUrl, {
			headers,
			next: { revalidate: 0 },
		});

		if (!response.ok) {
			console.error(
				`MediaWiki API error - Status: ${response.status}, StatusText: ${response.statusText}`,
			);
			throw new Error(
				`MediaWiki API responded with status: ${response.status} (${response.statusText})`,
			);
		}

		const data = await response.json();

		// Log a sample of the response data for debugging
		console.log(
			`API response received. Response structure:`,
			JSON.stringify(
				{
					responseKeys: Object.keys(data),
					hasQuery: !!data.query,
					hasPages: data.query && !!data.query.pages,
					hasError: !!data.error,
					errorInfo: data.error ? data.error : null,
					warnings: data.warnings ? data.warnings : null,
				},
				null,
				2,
			),
		);

		if (!data.query || !data.query.pages) {
			if (data.error) {
				console.error(`MediaWiki API error details:`, data.error);
				throw new Error(
					`MediaWiki API error: ${data.error.code} - ${data.error.info}`,
				);
			}
			throw new Error(
				"Invalid response from MediaWiki API - missing query.pages structure",
			);
		}

		// Define an interface for the Wikipedia API page response
		interface WikipediaApiPage {
			pageid: number;
			title: string;
			extract?: string;
			thumbnail?: {
				source: string;
				width: number;
				height: number;
			};
			touched?: string;
			categories?: Array<{ title: string }>;
			fullurl?: string;
			editurl?: string;
			canonicalurl?: string;
			contentmodel?: string;
			pagelanguage?: string;
			pagelanguagehtmlcode?: string;
			pagelanguagedir?: string;
			displaytitle?: string;
			lastrevid?: number;
			length?: number;
		}

		// Define the pages object structure
		interface WikipediaApiPages {
			[pageId: string]: WikipediaApiPage;
		}

		// Convert the pages object to an array of WikipediaData objects
		const pages = data.query.pages as WikipediaApiPages;
		const articles: WikipediaData[] = Object.values(pages).map((page) => {
			// Create article object with all properties from the API response
			const article: WikipediaData = {
				title: page.title || "Unknown Title",
				extract: page.extract || "No extract available",
				pageid: page.pageid,
				touched: page.touched,
				thumbnail: page.thumbnail,
				fullurl: page.fullurl,
				editurl: page.editurl,
				canonicalurl: page.canonicalurl,
				contentmodel: page.contentmodel,
				pagelanguage: page.pagelanguage,
				displaytitle: page.displaytitle,
				// Initialize these for our internal logic
				categories: [],
				type: "standard",
			};

			// Extract categories if available
			if (page.categories && Array.isArray(page.categories)) {
				article.categories = page.categories
					.map((cat: { title: string }) => cat.title.replace(/^Category:/, ""))
					.slice(0, 5); // Limit to 5 categories
			}

			// Add Wikipedia URL to content_urls for backwards compatibility
			// This ensures it works with existing code that expects the content_urls structure
			article.content_urls = {
				desktop: {
					page:
						page.fullurl ||
						`https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`,
				},
			};

			return article;
		});

		return articles;
	} catch (error) {
		console.error("Error fetching random articles:", error);
		// Log additional context for network errors
		if (error instanceof TypeError && error.message.includes("fetch")) {
			console.error("Network error details:", {
				message: error.message,
				stack: error.stack,
				cause: error.cause,
			});
		}
		return [];
	}
}

/**
 * Check if an article is suitable based on our criteria
 * Centralized all disambiguation and suitability checks into a single function
 */
function isArticleSuitable(article: WikipediaData): boolean {
	// Basic validation
	if (!article || !article.extract || article.extract.length < 200) {
		return false;
	}

	// Filter out RTL language articles
	// Check both the language direction if available and common RTL language codes
	if (
		// Check if language direction is explicitly 'rtl'
		(article.pagelanguagedir && article.pagelanguagedir === "rtl") ||
		// Check for common RTL language codes
		(article.pagelanguage &&
			["ar", "he", "fa", "ur", "yi", "dv", "ha", "ps", "sd"].includes(
				article.pagelanguage,
			))
	) {
		return false;
	}

	// Centralized disambiguation detection
	const isDisambiguation = checkIfDisambiguation(article);
	if (isDisambiguation) {
		return false;
	}

	// Check for the pattern "XXX is/are a/an XXX by XXX" in the extract
	// This typically indicates articles about books, films, songs, etc.
	const isArePattern = /^.+?\s+(?:is|are)\s+(?:a|an)\s+.+?\s+by\s+.+?/i;
	if (isArePattern.test(article.extract)) {
		return false;
	}

	// Extract lowercase text once for all checks
	const extractLower = article.extract.toLowerCase();

	// Filter out articles about people
	const peopleTerms = [
		"researcher",
		"professor",
		"artist",
		"writer",
		"actor",
		"singer",
		"songwriter",
		"musician",
	];
	if (peopleTerms.some((term) => extractLower.includes(term))) {
		return false;
	}

	return true;
}

/**
 * Helper function to check if an article is a disambiguation page
 * Extracted to avoid duplicate checks and improve readability
 */
function checkIfDisambiguation(article: WikipediaData): boolean {
	// Check the type property if available
	if (article.type === "disambiguation") {
		return true;
	}

	// Check for disambiguation in title
	if (article.title.includes("(disambiguation)")) {
		return true;
	}

	// Check for common disambiguation phrases in the extract
	if (article.extract) {
		const disambiguationPhrases = [
			"may refer to",
			"can refer to",
			"commonly refers to",
			"usually refers to",
			"is a disambiguation page",
			"may mean",
			"can mean",
			"refers to various",
		];

		const extractLower = article.extract.toLowerCase();
		if (disambiguationPhrases.some((phrase) => extractLower.includes(phrase))) {
			return true;
		}
	}

	// Check for disambiguation categories
	if (article.categories && Array.isArray(article.categories)) {
		if (
			article.categories.some(
				(category: string) =>
					category.toLowerCase().includes("disambiguation") ||
					category.toLowerCase().includes("disambig"),
			)
		) {
			return true;
		}
	}

	return false;
}

/**
 * Sanitize text by removing RTL characters and scripts
 * This provides a fallback in case RTL text slips through our filters
 */
function sanitizeRtlText(text: string): string {
	if (!text) return text;

	// Remove RTL Unicode control characters
	text = text.replace(/[\u200F\u202E\u202B\u202A\u202D\u202C\u061C]/g, "");

	// Remove common RTL script character ranges
	// - Arabic (0600-06FF)
	// - Hebrew (0590-05FF)
	// - Persian/Farsi extensions
	// - Other RTL scripts
	text = text.replace(
		/[\u0590-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
		"",
	);

	return text;
}

/**
 * Internal function to fetch and process Wikipedia data
 * Always attempts to fetch fresh data and refuel reservoir
 */
async function getWikipediaArticle(): Promise<WikipediaData | null> {
	try {
		console.log("Fetching fresh articles from Wikipedia API");

		// Fetch 10 random articles with their content in a single request
		const randomArticles = await fetchRandomArticles(10);

		if (randomArticles.length === 0) {
			throw new Error("Failed to fetch random articles");
		}

		console.log(`Fetched ${randomArticles.length} random articles`);

		// Filter out unsuitable articles - using our improved function
		const suitableArticles = randomArticles.filter(isArticleSuitable);

		console.log(
			`Found ${suitableArticles.length} suitable articles out of ${randomArticles.length}`,
		);

		// If we have suitable articles, pick one randomly and process it
		if (suitableArticles.length > 0) {
			const selectedArticle = await processSelectedArticle(suitableArticles);

			// Add successful articles to reservoir for future use
			addToReservoir(selectedArticle);

			// Also add a few more articles to the reservoir if we have them
			const additionalArticles = suitableArticles
				.filter((article) => article.title !== selectedArticle.title)
				.slice(0, 3); // Add up to 3 more articles

			additionalArticles.forEach((article) => {
				addToReservoir(article);
			});

			return selectedArticle;
		}

		// If no suitable articles found, try a second batch
		console.log(
			"No suitable articles found in first batch, trying a second batch",
		);
		const secondBatchArticles = await fetchRandomArticles(10);
		const secondBatchSuitable = secondBatchArticles.filter(isArticleSuitable);

		if (secondBatchSuitable.length > 0) {
			console.log(
				`Found ${secondBatchSuitable.length} suitable articles in second batch`,
			);
			const selectedArticle = await processSelectedArticle(secondBatchSuitable);

			// Add to reservoir
			addToReservoir(selectedArticle);

			return selectedArticle;
		}

		// If still no suitable articles found, use fallback mechanisms
		const fallbackArticle = await getFallbackArticle();

		// Add fallback article to reservoir as well
		addToReservoir(fallbackArticle);

		return fallbackArticle;
	} catch (error) {
		console.error("Error in getWikipediaArticle:", error);
		markApiFailure();

		// Try to get from reservoir as fallback
		const reservoirArticle = getFromReservoir();
		if (reservoirArticle) {
			console.log("API failed, using reservoir as fallback");
			return reservoirArticle;
		}

		return DEFAULT_FALLBACK_DATA;
	}
}

/**
 * Process a selected article - simplified to directly use the API data
 */
async function processSelectedArticle(
	suitableArticles: WikipediaData[],
): Promise<WikipediaData> {
	// Select a random article from the suitable ones
	const selectedArticle =
		suitableArticles[Math.floor(Math.random() * suitableArticles.length)];

	// Check that the article has the required essential fields
	if (!selectedArticle.title || !selectedArticle.extract) {
		console.warn(
			`Selected article missing essential fields: ${selectedArticle.title}`,
		);

		// Try another article if available
		const remainingArticles = suitableArticles.filter(
			(a) => a !== selectedArticle,
		);
		if (remainingArticles.length > 0) {
			console.log("Trying another article from the suitable pool");
			return remainingArticles[
				Math.floor(Math.random() * remainingArticles.length)
			];
		}
	}

	// Create content_urls if it doesn't exist but fullurl does
	if (selectedArticle.fullurl && !selectedArticle.content_urls) {
		selectedArticle.content_urls = {
			desktop: {
				page: selectedArticle.fullurl,
			},
		};
	}

	// Sanitize any potential RTL characters in the text fields as a fallback protection
	selectedArticle.title = sanitizeRtlText(selectedArticle.title);
	selectedArticle.extract = sanitizeRtlText(selectedArticle.extract);
	if (selectedArticle.description) {
		selectedArticle.description = sanitizeRtlText(selectedArticle.description);
	}

	console.log(`Using article: "${selectedArticle.title}"`);
	return selectedArticle;
}

/**
 * Use a fallback article when random articles don't yield suitable results
 * Extracted to improve maintainability
 */
async function getFallbackArticle(): Promise<WikipediaData> {
	console.log("No suitable articles found, trying fallback article");
	const fallbackArticle = getRandomFallbackArticleTitle();
	console.log(`Using fallback article: ${fallbackArticle}`);

	// Fetch the fallback article using the REST API for more complete data
	try {
		const encodedTitle = encodeURIComponent(fallbackArticle);
		const headers = new Headers({
			Accept: "application/json",
			"Api-User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		});

		// Add Authorization header with bearer token if WIKIPEDIA_ACCESS_TOKEN is available
		const accessToken = process.env.WIKIPEDIA_ACCESS_TOKEN;
		if (accessToken) {
			headers.set("Authorization", `Bearer ${accessToken}`);
		}

		const response = await fetchWithRetry(
			`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
			{
				headers,
				next: { revalidate: 0 },
			},
		);

		if (!response.ok) {
			throw new Error(
				`Wikipedia API responded with status: ${response.status}`,
			);
		}

		const fallbackData = await response.json();

		// Check if the fallback article is a disambiguation page
		if (
			checkIfDisambiguation({
				title: fallbackData.title,
				extract: fallbackData.extract,
				type: fallbackData.type,
			})
		) {
			console.log(
				`Fallback article "${fallbackData.title}" is a disambiguation page, trying direct fallback`,
			);
			throw new Error("Fallback article is a disambiguation page");
		}

		// Sanitize any potential RTL characters
		fallbackData.title = sanitizeRtlText(fallbackData.title);
		fallbackData.extract = sanitizeRtlText(fallbackData.extract);
		if (fallbackData.description) {
			fallbackData.description = sanitizeRtlText(fallbackData.description);
		}

		return {
			title: fallbackData.title,
			extract: fallbackData.extract,
			thumbnail: fallbackData.thumbnail,
			content_urls: fallbackData.content_urls,
			description: fallbackData.description,
			type: fallbackData.type,
			pageid: fallbackData.pageid,
		};
	} catch (fallbackError) {
		console.error("Fallback article fetch failed:", fallbackError);

		// Try one more time with a specific fallback article
		try {
			console.log("Attempting direct fallback fetch...");
			const directFallbackArticle = "Electronic_paper"; // Most reliable fallback
			const encodedTitle = encodeURIComponent(directFallbackArticle);
			const headers = new Headers({
				Accept: "application/json",
				"Api-User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			});

			// Add Authorization header with bearer token if WIKIPEDIA_ACCESS_TOKEN is available
			const accessToken = process.env.WIKIPEDIA_ACCESS_TOKEN;
			if (accessToken) {
				headers.set("Authorization", `Bearer ${accessToken}`);
			}

			const response = await fetchWithRetry(
				`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
				{
					headers,
					next: { revalidate: 0 },
				},
			);

			if (!response.ok) {
				throw new Error(
					`Wikipedia API responded with status: ${response.status}`,
				);
			}

			const directFallbackData = await response.json();

			// Check if even this direct fallback is a disambiguation page (very unlikely)
			if (
				checkIfDisambiguation({
					title: directFallbackData.title,
					extract: directFallbackData.extract,
					type: directFallbackData.type,
				})
			) {
				console.log(
					`Even direct fallback "${directFallbackData.title}" is a disambiguation page, using default data`,
				);
				return DEFAULT_FALLBACK_DATA;
			}

			// Sanitize any potential RTL characters
			directFallbackData.title = sanitizeRtlText(directFallbackData.title);
			directFallbackData.extract = sanitizeRtlText(directFallbackData.extract);
			if (directFallbackData.description) {
				directFallbackData.description = sanitizeRtlText(
					directFallbackData.description,
				);
			}

			return {
				title: directFallbackData.title,
				extract: directFallbackData.extract,
				thumbnail: directFallbackData.thumbnail,
				content_urls: directFallbackData.content_urls,
				description: directFallbackData.description,
				type: directFallbackData.type,
				pageid: directFallbackData.pageid,
			};
		} catch (directFallbackError) {
			console.error("All fetch attempts failed:", directFallbackError);
		}
	}

	// Return the hardcoded default data as last resort
	return DEFAULT_FALLBACK_DATA;
}

/**
 * Function that fetches Wikipedia data without caching
 */
async function fetchWikipediaData(): Promise<WikipediaData> {
	try {
		const data = await getWikipediaArticle();

		// If data is null (which shouldn't happen with our improved fallbacks), return default data
		if (!data) {
			console.log("Returning default fallback data");
			return DEFAULT_FALLBACK_DATA;
		}

		return data;
	} catch (error) {
		console.error("Unexpected error in fetchWikipediaData:", error);
		return DEFAULT_FALLBACK_DATA;
	}
}

/**
 * Cached function that serves as the entry point for fetching Wikipedia data
 * Using a short cache time and better error handling
 */
const getCachedWikipediaData = unstable_cache(
	async (): Promise<WikipediaData> => {
		try {
			const data = await getWikipediaArticle();

			// If data is null or empty, throw an error to prevent caching
			if (!data || !data.title || !data.extract) {
				throw new Error("Empty or invalid data - skip caching");
			}

			return data;
		} catch (error) {
			// Convert the error to a clean one to avoid serialization issues
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to fetch Wikipedia data: ${errorMessage}`);
		}
	},
	["wikipedia-random-article"],
	{
		tags: ["wikipedia"],
		revalidate: process.env.NODE_ENV === "production" ? 90 : 5 * 60, // Cache for 1.5 minutes (90 seconds) in production or 5 min for developing
	},
);

/**
 * Main export function with reservoir cache integration
 * Always attempts to refuel reservoir unless in timeout situation
 */
export default async function getData(): Promise<WikipediaData> {
	console.log("Wikipedia getData function called");

	// Get a quick article from reservoir if available (for immediate response)
	let immediateArticle: WikipediaData | null = null;
	if (shouldUseReservoir()) {
		immediateArticle = getFromReservoir();
		if (immediateArticle) {
			console.log(
				"Got immediate article from reservoir, but will still attempt API refuel",
			);
		}
	}

	// Always attempt to refuel the reservoir unless we're in a timeout situation
	try {
		console.log(
			"Attempting to fetch cached Wikipedia data (refueling reservoir)",
		);
		const freshArticle = await Promise.race([
			getCachedWikipediaData(),
			// If the cache operation takes too long (4 seconds), proceed to fallback
			new Promise<WikipediaData>((_, reject) => {
				setTimeout(() => reject(new Error("Cache operation timeout")), 4000);
			}),
		]);

		// If we got a fresh article, return it (reservoir was already updated in getWikipediaArticle)
		console.log("Successfully fetched fresh article, returning it");
		return freshArticle;
	} catch (error) {
		// Log the error but don't expose internal details
		const isTimeout =
			error instanceof Error &&
			(error.name === "AbortError" ||
				(error as DOMException).code === 20 ||
				error.message.includes("abort") ||
				error.message.includes("timeout"));

		if (isTimeout) {
			console.warn(
				"Wikipedia data fetch timed out, using reservoir if available",
			);
		} else {
			console.error("Error fetching Wikipedia data:", {
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				cause: error instanceof Error && error.cause ? error.cause : undefined,
			});
		}

		// If we have an immediate article from reservoir, use it
		if (immediateArticle) {
			console.log("Using immediate article from reservoir due to API failure");
			return immediateArticle;
		}

		// Try to get from reservoir as fallback
		const reservoirArticle = getFromReservoir();
		if (reservoirArticle) {
			console.log("Cache failed, using reservoir as fallback");
			return reservoirArticle;
		}

		try {
			// One final attempt with uncached direct fetch with short timeout
			console.log("Attempting direct uncached fetch as final fallback");
			// This is already configured with retry and timeout logic in fetchWithRetry
			return await fetchWikipediaData();
		} catch (fetchError) {
			console.error("All Wikipedia data fetch attempts failed:", {
				errorType:
					fetchError instanceof Error
						? fetchError.constructor.name
						: typeof fetchError,
				message:
					fetchError instanceof Error ? fetchError.message : String(fetchError),
			});

			// Final reservoir check
			const finalReservoirArticle = getFromReservoir();
			if (finalReservoirArticle) {
				console.log("All API attempts failed, using reservoir as last resort");
				return finalReservoirArticle;
			}

			// When all attempts fail, return default fallback data
			console.log(
				"Returning DEFAULT_FALLBACK_DATA after all fetch attempts failed",
			);
			return DEFAULT_FALLBACK_DATA;
		}
	}
}
