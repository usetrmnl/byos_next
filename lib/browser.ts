import puppeteer, { type Browser } from "puppeteer";

// Browser launch options optimized for screenshotting
// Inspired by Ferrum/Ruby implementation
const BROWSER_OPTIONS = [
	"--disable-dev-shm-usage",
	"--disable-gpu",
	"--hide-scrollbar",
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--disable-accelerated-2d-canvas",
	"--disable-web-security",
	"--disable-features=IsolateOrigins,site-per-process",
];

// Singleton browser instance
let browserInstance: Browser | null = null;

/**
 * Get or create the shared browser instance
 */
export async function getBrowser(): Promise<Browser> {
	if (!browserInstance) {
		console.log("[Browser] Creating new browser instance");
		browserInstance = await puppeteer.launch({
			headless: true,
			args: BROWSER_OPTIONS,
		});
		console.log("[Browser] Browser instance created");

		// Handle graceful shutdown
		process.on("exit", closeBrowser);
		process.on("SIGINT", async () => {
			await closeBrowser();
			process.exit(0);
		});
		process.on("SIGTERM", async () => {
			await closeBrowser();
			process.exit(0);
		});
	} else {
		console.log("[Browser] Reusing existing browser instance");
	}

	return browserInstance;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
	if (browserInstance) {
		try {
			await browserInstance.close();
			console.log("[Browser] Browser closed");
		} catch (error) {
			console.error("[Browser] Error closing browser:", error);
		} finally {
			browserInstance = null;
		}
	}
}
