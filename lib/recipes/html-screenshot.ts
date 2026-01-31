import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

const PUPPETEER_CHROME =
	"~/.cache/puppeteer/chrome/mac_arm-144.0.7559.96/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing".replace(
		"~",
		process.env.HOME ?? "",
	);

let browser: Browser | null = null;

const IS_LOCAL = process.platform === "darwin" || process.platform === "win32";

async function getBrowser(): Promise<Browser> {
	if (!browser || !browser.connected) {
		if (IS_LOCAL) {
			browser = await puppeteer.launch({
				executablePath: PUPPETEER_CHROME,
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});
		} else {
			const executablePath = await chromium.executablePath();
			browser = await puppeteer.launch({
				args: chromium.args,
				executablePath,
				headless: true,
			});
		}
	}
	return browser;
}

/**
 * Render a complete HTML document to a PNG buffer using Puppeteer.
 * Expects the HTML to already include all required CSS and JS.
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
		await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });
		// Allow linked CSS/JS/fonts to load and execute before taking the screenshot
		await new Promise((r) => setTimeout(r, 1500));
		const screenshot = await page.screenshot({
			type: "png",
			clip: { x: 0, y: 0, width, height },
		});
		return Buffer.from(screenshot);
	} finally {
		await page.close();
	}
}
