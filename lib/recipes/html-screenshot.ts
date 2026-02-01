import puppeteer, { type Browser } from "puppeteer-core";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
	if (browser?.connected) return browser;

	let executablePath: string;
	let args: string[];

	// Docker: use CHROME_BIN or CHROMIUM_PATH
	if (process.env.CHROME_BIN || process.env.CHROMIUM_PATH) {
		executablePath = (process.env.CHROME_BIN ||
			process.env.CHROMIUM_PATH) as string;
		args = [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
			"--hide-scrollbars",
		];
	}
	// Local: try Chrome
	else {
		try {
			executablePath = puppeteer.executablePath("chrome");
			args = ["--no-sandbox", "--disable-setuid-sandbox"];
		} catch {
			// Serverless: chromium-min
			const chromium = (await import("@sparticuz/chromium-min")).default;
			const arch = process.arch === "arm64" ? "arm64" : "x64";
			const url = `https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.${arch}.tar`;
			executablePath = await chromium.executablePath(url);
			args = chromium.args;
		}
	}

	browser = await puppeteer.launch({ executablePath, headless: true, args });
	return browser;
}

/**
 * Render a complete HTML document to a PNG buffer using Puppeteer.
 */
export async function renderHtmlToImage(
	html: string,
	width: number,
	height: number,
): Promise<Buffer> {
	const b = await getBrowser();
	const page = await b.newPage();
	try {
		await page.setViewport({ width, height });
		await page.setContent(html, {
			waitUntil: "networkidle0",
			timeout: 15000,
		});
		const screenshot = await page.screenshot({
			type: "png",
			clip: { x: 0, y: 0, width, height },
		});
		return Buffer.from(screenshot);
	} finally {
		await page.close();
	}
}
