import puppeteer from "puppeteer";

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

const NAVIGATION_TIMEOUT = 10000; // 10 seconds
const NETWORK_IDLE_DURATION = 1000; // 1 second

export interface BrowserRenderOptions {
	slug: string;
	width: number;
	height: number;
}

// Singleton browser instance
let browserInstance: puppeteer.Browser | null = null;

/**
 * Get or create the shared browser instance
 */
async function getBrowser(): Promise<puppeteer.Browser> {
	if (!browserInstance) {
		browserInstance = await puppeteer.launch({
			headless: true,
			args: BROWSER_OPTIONS,
		});

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
	}

	return browserInstance;
}

/**
 * Close the browser instance
 */
async function closeBrowser(): Promise<void> {
	if (browserInstance) {
		try {
			await browserInstance.close();
			console.log("[BrowserRenderer] Browser closed");
		} catch (error) {
			console.error("[BrowserRenderer] Error closing browser:", error);
		} finally {
			browserInstance = null;
		}
	}
}

/**
 * Get the base URL for the preview route
 */
function getBaseUrl(): string {
	const port = process.env.PORT || 3000;
	return `http://127.0.0.1:${port}`;
}

/**
 * Render a recipe using Puppeteer browser screenshot
 * Navigates to the /recipes/[slug]/preview route and captures a screenshot
 * Uses a shared browser instance for performance
 */
export async function renderWithBrowser({
	slug,
	width,
	height,
}: BrowserRenderOptions): Promise<Buffer | null> {
	let page: puppeteer.Page | null = null;

	try {
		const baseUrl = getBaseUrl();
		const previewUrl = `${baseUrl}/recipes/${slug}/preview?width=${width}&height=${height}`;

		// Get shared browser instance
		const browser = await getBrowser();

		// Create a new page from the shared browser
		page = await browser.newPage();

		// Set viewport to match desired output dimensions
		await page.setViewport({
			width,
			height,
			deviceScaleFactor: 1,
		});

		// Navigate to the preview route with timeout
		await page.goto(previewUrl, {
			waitUntil: "networkidle0",
			timeout: NAVIGATION_TIMEOUT,
		});

		// Additional wait for any final rendering (matching Ruby's 1s idle wait)
		await new Promise((resolve) => setTimeout(resolve, NETWORK_IDLE_DURATION));

		// Capture screenshot as PNG
		const screenshot = await page.screenshot({
			type: "png",
			encoding: "binary",
		});

		return Buffer.from(screenshot);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		// Log specific error types for debugging
		if (errorMessage.includes("timeout")) {
			console.error(
				`[BrowserRenderer] Timeout after ${NAVIGATION_TIMEOUT}ms for recipe: ${slug}`,
			);
		} else if (errorMessage.includes("net::")) {
			console.error(
				`[BrowserRenderer] Network error for recipe ${slug}: ${errorMessage}`,
			);
		} else {
			console.error(
				`[BrowserRenderer] Error rendering ${slug}: ${errorMessage}`,
			);
		}

		return null;
	} finally {
		// Always close the page, but keep the browser running
		if (page) {
			try {
				await page.close();
			} catch (closeError) {
				console.error("[BrowserRenderer] Error closing page:", closeError);
			}
		}
	}
}
