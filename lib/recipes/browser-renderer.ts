import type { Page } from "puppeteer";
import { getBrowser } from "@/lib/browser";

const NAVIGATION_TIMEOUT = 10000;
const NETWORK_IDLE_DURATION = 500;

export interface BrowserRenderOptions {
	slug: string;
	width: number;
	height: number;
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
	let page: Page | null = null;

	try {
		const baseUrl = getBaseUrl();
		const previewUrl = `${baseUrl}/recipes/${slug}/preview?width=${width}&height=${height}`;

		// Get shared browser instance
		const browser = await getBrowser();

		// Create a new page from the shared browser
		page = await browser.newPage();

		// Force light mode — headless Chrome can default to dark, which breaks Tailwind v4 color tokens
		await page.emulateMediaFeatures([
			{ name: "prefers-color-scheme", value: "light" },
		]);

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
