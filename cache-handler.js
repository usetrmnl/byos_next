// this is for caching testing on local machine
// Create a global memory cache that persists between requests
// This needs to be outside the module to be shared across instances
global.bitmapCache = global.bitmapCache || new Map();

module.exports = class CustomCacheHandler {
	constructor(options) {
		this.options = options;
		this.isProduction = process.env.NODE_ENV === "production";

		// Only log initialization once per server instance
		if (!global.cacheInitialized) {
			if (this.isProduction) {
				console.log("🔧 Production mode: Using Next.js built-in cache");
			} else {
				console.log(
					"🔧 Development mode: Using lightweight memory-only cache handler",
				);
			}
			global.cacheInitialized = true;
		}
	}

	async get(key) {
		// In production, always return null to use Next.js built-in caching
		if (this.isProduction) {
			return null;
		}

		// Only handle api/bitmap routes
		if (!key.includes("api/bitmap")) {
			return null;
		}

		// Check memory cache
		if (global.bitmapCache.has(key)) {
			const item = global.bitmapCache.get(key);
			const now = Date.now();

			// Check if the item is still valid
			if (item.expiresAt > now) {
				console.log(`🔵 Memory cache HIT for ${key}`);
				return item.data;
			}
			console.log(`🟡 Memory cache STALE for ${key}`);
			// Return stale data but mark for revalidation
			return {
				...item.data,
				isStale: true,
			};
		}

		console.log(`⚪ Cache MISS for ${key}`);
		return null;
	}

	async set(key, data, options = {}) {
		// In production, always return false to use Next.js built-in caching
		if (this.isProduction) {
			return false;
		}

		// Only handle api/bitmap routes
		if (!key.includes("api/bitmap")) {
			return false;
		}

		const revalidate = options?.revalidate || 60; // Default to 60 seconds
		const now = Date.now();
		const expiresAt =
			revalidate === Number.POSITIVE_INFINITY
				? Number.POSITIVE_INFINITY
				: now + revalidate * 1000;

		// Store in memory using the global cache
		global.bitmapCache.set(key, {
			data,
			expiresAt,
		});

		console.log(
			`💾 Memory cache SET for ${key} with revalidate: ${revalidate}s`,
		);
		return true;
	}
};
