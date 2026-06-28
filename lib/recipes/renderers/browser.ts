import type { CookieData } from "puppeteer-core";
import { getBrowser } from "@/lib/recipes/chrome-pool";
import { createBrowserRenderContext } from "@/lib/recipes/render/browser-context";

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
 * Each render runs in its own ephemeral browser context (Chrome's incognito
 * equivalent), so cookies set for the caller's session never leak into
 * later renders sharing the pooled Browser. Without this isolation an
 * authenticated render could carry session cookies into an anonymous
 * device-image render fired moments later.
 *
 * Uses the "trusted" Chrome profile — web security is disabled so the preview
 * page can freely reference cross-origin images. This is only safe because
 * the page is our own same-origin Next.js route.
 */
export type RenderWithBrowserOptions = {
	model?: string | null;
	paletteId?: string | null;
	userId?: string | null;
	captureWidth?: number;
	captureHeight?: number;
};

export async function renderWithBrowser(
	slug: string,
	width: number,
	height: number,
	cookies?: string,
	options: RenderWithBrowserOptions = {},
): Promise<Buffer> {
	const port = process.env.PORT || 3000;
	const baseUrl = `http://127.0.0.1:${port}`;
	const params = new URLSearchParams({
		width: String(width),
		height: String(height),
	});
	if (options.model) params.set("model", options.model);
	if (options.paletteId) params.set("palette_id", options.paletteId);
	if (options.userId) {
		params.set("render_token", createBrowserRenderContext(options.userId));
	}
	const url = `${baseUrl}/recipes/${slug}/preview?${params.toString()}`;
	const captureWidth = options.captureWidth ?? width;
	const captureHeight = options.captureHeight ?? height;

	const browser = await getBrowser("trusted");
	const context = await browser.createBrowserContext();
	const page = await context.newPage();

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
			// Cookies are set on the per-render context — they go away with it.
			await context.setCookie(...cookiesToSet);
		}

		// Force light mode — headless Chrome can default to dark, which breaks
		// Tailwind v4 color tokens that rely on prefers-color-scheme.
		await page.emulateMediaFeatures([
			{ name: "prefers-color-scheme", value: "light" },
		]);
		await page.setViewport({
			width: captureWidth,
			height: captureHeight,
			deviceScaleFactor: 1,
		});
		await page.goto(url, { waitUntil: "domcontentloaded" });
		await page
			.waitForNetworkIdle({ idleTime: 500, timeout: 5000 })
			.catch(() => {
				// Some recipes include slow third-party assets; capture the server-rendered
				// page rather than failing the whole device render.
			});
		const screenshot = await page.screenshot({
			type: "png",
			clip: { x: 0, y: 0, width: captureWidth, height: captureHeight },
		});
		return Buffer.from(screenshot);
	} finally {
		try {
			await page.close();
		} catch {
			// page.close can race with context.close; the latter is the real cleanup.
		}
		try {
			await context.close();
		} catch {
			// If the browser is already gone, the pool will reopen on next call.
		}
	}
}
