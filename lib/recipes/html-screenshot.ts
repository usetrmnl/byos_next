import { getBrowser } from "@/lib/recipes/chrome-pool";
import { injectTrmnlCssIntoHtml } from "@/lib/trmnl/model-css";
import type { TrmnlModel } from "@/lib/trmnl/registry";

/**
 * Render a complete HTML document to a PNG buffer using Puppeteer.
 *
 * Uses the "sandboxed" Chrome profile — web security stays ON because the
 * HTML originates from user-authored Liquid recipes in the DB.
 *
 * If `model` is provided, the model's `css.variables` (as `:root` custom
 * properties) and `css.classes` (merged onto the body element) are injected
 * before screenshotting, so plugins authored against the TRMNL framework CSS
 * contract render faithfully.
 */
export async function renderHtmlToImage(
	html: string,
	width: number,
	height: number,
	model?: TrmnlModel | null,
): Promise<Buffer> {
	const browser = await getBrowser("sandboxed");
	const page = await browser.newPage();
	try {
		await page.setViewport({ width, height });
		await page.setContent(injectTrmnlCssIntoHtml(html, model ?? null), {
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
