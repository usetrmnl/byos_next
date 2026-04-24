// Minimal local interfaces instead of importing from puppeteer or puppeteer-core.
// Both are optional dependencies — importing their types directly would cause
// TypeScript to fail in environments where neither package is installed.
// We only describe the methods we actually use.

interface Browser {
	connected: boolean;
	newPage(): Promise<Page>;
	close(): Promise<void>;
	disconnect(): void;
}

interface Cookie {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: number;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "Strict" | "Lax" | "None";
}

interface Page {
	emulateMediaFeatures(
		features: Array<{ name: string; value: string }>,
	): Promise<void>;
	setViewport(viewport: {
		width: number;
		height: number;
		deviceScaleFactor: number;
	}): Promise<void>;
	setCookie(...cookies: Cookie[]): Promise<void>;
	goto(url: string, options?: { waitUntil: string }): Promise<unknown>;
	screenshot(options?: { type: string }): Promise<Uint8Array>;
	close(): Promise<void>;
}

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

let browser: Browser | null = null;

async function closeBrowser(): Promise<void> {
	if (browser) {
		try {
			// disconnect() for remote browsers, close() for local ones
			if (process.env.BROWSER_URL || process.env.BROWSER_WS_ENDPOINT) {
				browser.disconnect();
			} else {
				await browser.close();
			}
		} catch (error) {
			console.error("[Browser] Error closing browser:", error);
		} finally {
			browser = null;
		}
	}
}

async function getBrowser(): Promise<Browser> {
	if (!browser || !browser.connected) {
		const browserUrl = process.env.BROWSER_URL;
		const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
		const executablePath = process.env.CHROME_EXECUTABLE_PATH;

		// puppeteer-core and puppeteer are optional dependencies — types may not
		// be present in non-browser builds, hence the @ts-expect-error comments.
		// serverExternalPackages in next.config.ts prevents the bundler from
		// trying to bundle or resolve these at build time.
		if (browserUrl) {
			// browserURL lets Puppeteer discover the WebSocket URL via /json/version,
			// avoiding the need to know Chrome's UUID-based WS path upfront.
			// biome-ignore lint: optional dependency, types absent in non-browser builds
			// @ts-expect-error
			const { connect } = await import("puppeteer-core");
			browser = (await connect({
				browserURL: browserUrl,
			})) as unknown as Browser;
		} else if (wsEndpoint) {
			// biome-ignore lint: optional dependency, types absent in non-browser builds
			// @ts-expect-error
			const { connect } = await import("puppeteer-core");
			browser = (await connect({
				browserWSEndpoint: wsEndpoint,
			})) as unknown as Browser;
		} else if (executablePath) {
			// biome-ignore lint: optional dependency, types absent in non-browser builds
			// @ts-expect-error
			const { launch } = await import("puppeteer-core");
			browser = (await launch({
				headless: true,
				executablePath,
				args: BROWSER_OPTIONS,
			})) as unknown as Browser;
		} else {
			// biome-ignore lint: optional dependency, types absent in non-browser builds
			// @ts-expect-error
			const { launch } = await import("puppeteer");
			browser = (await launch({
				headless: true,
				args: BROWSER_OPTIONS,
			})) as unknown as Browser;
		}
	}
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
	// biome-ignore lint/style/noNonNullAssertion: guaranteed to be set above
	return browser!;
}

/**
 * Parse a Cookie header string into individual cookie objects
 */
function parseCookies(
	cookieHeader: string,
): Array<{ name: string; value: string }> {
	const cookies: Array<{ name: string; value: string }> = [];
	const pairs = cookieHeader.split(";");

	for (const pair of pairs) {
		const trimmed = pair.trim();
		if (!trimmed) continue;

		const eqIndex = trimmed.indexOf("=");
		if (eqIndex > 0) {
			const name = trimmed.substring(0, eqIndex).trim();
			const value = trimmed.substring(eqIndex + 1).trim();
			cookies.push({ name, value });
		}
	}

	return cookies;
}

export async function renderWithBrowser(
	slug: string,
	width: number,
	height: number,
	scale = 1,
	cookies?: string,
): Promise<Buffer> {
	const port = process.env.PORT || 3000;
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`;
	// Pass original dimensions to the component — it handles scaling internally
	const url = `${baseUrl}/recipes/${slug}/preview?width=${width}&height=${height}`;

	const b = await getBrowser();
	const page = await b.newPage();

	try {
		// Forward cookies to the page so it can authenticate
		if (cookies) {
			const parsedCookies = parseCookies(cookies);
			const urlObj = new URL(url);
			const domain = urlObj.hostname;

			const cookiesToSet = parsedCookies.map((cookie) => ({
				name: cookie.name,
				value: cookie.value,
				domain: domain,
				path: "/",
			}));

			await page.setCookie(...cookiesToSet);
		}

		// Force light mode — headless Chrome can default to dark, which breaks Tailwind v4 color tokens
		await page.emulateMediaFeatures([
			{ name: "prefers-color-scheme", value: "light" },
		]);
		// Viewport is scaled up so the browser captures the full doubled canvas
		await page.setViewport({
			width: width * scale,
			height: height * scale,
			deviceScaleFactor: 1,
		});
		await page.goto(url, { waitUntil: "networkidle0" });
		const screenshot = await page.screenshot({ type: "png" });
		return Buffer.from(screenshot);
	} finally {
		await page.close();
	}
}
