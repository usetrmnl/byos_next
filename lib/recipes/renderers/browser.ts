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

interface Page {
	emulateMediaFeatures(
		features: Array<{ name: string; value: string }>,
	): Promise<void>;
	setViewport(viewport: {
		width: number;
		height: number;
		deviceScaleFactor: number;
	}): Promise<void>;
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
			if (process.env.BROWSER_WS_ENDPOINT) {
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
		const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
		const executablePath = process.env.CHROME_EXECUTABLE_PATH;

		// Use new Function to prevent the bundler from statically analyzing
		// these imports — both packages are optional dependencies
		// biome-ignore lint/security/noNewFunc: intentional bundler bypass for optional deps
		const unbundledImport = new Function("m", "return import(m)") as
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(m: string) => Promise<any>;

		if (wsEndpoint) {
			const { connect } = await unbundledImport("puppeteer-core");
			browser = await connect({ browserWSEndpoint: wsEndpoint });
		} else if (executablePath) {
			const { launch } = await unbundledImport("puppeteer-core");
			browser = await launch({
				headless: true,
				executablePath,
				args: BROWSER_OPTIONS,
			});
		} else {
			const { launch } = await unbundledImport("puppeteer");
			browser = await launch({ headless: true, args: BROWSER_OPTIONS });
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

export async function renderWithBrowser(
	slug: string,
	width: number,
	height: number,
	scale = 1,
): Promise<Buffer> {
	const port = process.env.PORT || 3000;
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`;
	// Pass original dimensions to the component — it handles scaling internally
	const url = `${baseUrl}/recipes/${slug}/preview?width=${width}&height=${height}`;

	const b = await getBrowser();
	const page = await b.newPage();

	try {
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
