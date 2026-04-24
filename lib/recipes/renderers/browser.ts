import type { CookieData } from "puppeteer-core";
import { getBrowser } from "@/lib/recipes/chrome-pool";

/**
 * Parse a Cookie header string into individual cookie objects.
 */
function parseCookies(
	cookieHeader: string,
): Array<{ name: string; value: string }> {
	const cookies: Array<{ name: string; value: string }> = [];
	for (const pair of cookieHeader.split(";")) {
		const trimmed = pair.trim();
		if (!trimmed) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex > 0) {
			cookies.push({
				name: trimmed.substring(0, eqIndex).trim(),
				value: trimmed.substring(eqIndex + 1).trim(),
			});
		}
	}
	return cookies;
}

/**
 * Render a React recipe by navigating to its preview URL on this Next.js
 * server and capturing a PNG.
 *
 * Uses the "trusted" Chrome profile — web security is disabled so the preview
 * page can freely reference cross-origin images. This is only safe because
 * the page is our own same-origin Next.js route.
 */
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
	const url = `${baseUrl}/recipes/${slug}/preview?width=${width}&height=${height}`;

	const browser = await getBrowser("trusted");
	const page = await browser.newPage();

	try {
		if (cookies) {
			const parsed = parseCookies(cookies);
			const domain = new URL(url).hostname;
			const cookiesToSet: CookieData[] = parsed.map((c) => ({
				name: c.name,
				value: c.value,
				domain,
				path: "/",
			}));
			await browser.setCookie(...cookiesToSet);
		}

		// Force light mode — headless Chrome can default to dark, which breaks
		// Tailwind v4 color tokens that rely on prefers-color-scheme.
		await page.emulateMediaFeatures([
			{ name: "prefers-color-scheme", value: "light" },
		]);
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
