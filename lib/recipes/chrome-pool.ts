import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Launch-arg profile. Each profile keeps its own pooled Browser because
 * Chrome flags are set at launch time and can't be changed per page.
 *
 * - "sandboxed": minimal flags, web-security ON. Use for user-authored content
 *   (Liquid recipes) where we must not let the page reach internal origins.
 * - "trusted": permissive flags including --disable-web-security. Use only for
 *   same-origin captures of our own Next.js pages (React recipe previews).
 */
export type ChromeProfile = "sandboxed" | "trusted";

const SANDBOXED_ARGS = [
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--disable-dev-shm-usage",
	"--disable-gpu",
	"--hide-scrollbars",
];

const TRUSTED_ARGS = [
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--disable-dev-shm-usage",
	"--disable-gpu",
	"--hide-scrollbars",
	"--disable-accelerated-2d-canvas",
	"--disable-web-security",
	"--disable-features=IsolateOrigins,site-per-process",
];

type Resolved =
	| { mode: "connect"; browserURL: string }
	| { mode: "connect"; browserWSEndpoint: string }
	| { mode: "launch"; executablePath: string };

/**
 * Resolve how to obtain a Chrome instance, in priority order:
 *   1. BROWSER_URL — remote Chrome discovered via /json/version
 *   2. BROWSER_WS_ENDPOINT — remote Chrome via direct WS endpoint
 *   3. CHROME_EXECUTABLE_PATH — explicit local binary
 *   4. puppeteer-core bundled lookup ("chrome")
 *   5. @sparticuz/chromium-min — serverless fallback
 */
async function resolveChrome(): Promise<Resolved> {
	const browserUrl = process.env.BROWSER_URL;
	if (browserUrl) return { mode: "connect", browserURL: browserUrl };

	const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;
	if (wsEndpoint) return { mode: "connect", browserWSEndpoint: wsEndpoint };

	const explicit = process.env.CHROME_EXECUTABLE_PATH;
	if (explicit) return { mode: "launch", executablePath: explicit };

	try {
		return {
			mode: "launch",
			executablePath: puppeteer.executablePath("chrome"),
		};
	} catch {
		const chromium = (await import("@sparticuz/chromium-min")).default;
		const arch = process.arch === "arm64" ? "arm64" : "x64";
		const url = `https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.${arch}.tar`;
		return {
			mode: "launch",
			executablePath: await chromium.executablePath(url),
		};
	}
}

async function openBrowser(profile: ChromeProfile): Promise<Browser> {
	const resolved = await resolveChrome();
	if (resolved.mode === "connect") {
		// Remote Chrome — caller controls launch flags, we only connect.
		// Profile args are ignored; the remote operator is responsible for
		// running an appropriately-sandboxed browser per intended use.
		return "browserURL" in resolved
			? puppeteer.connect({ browserURL: resolved.browserURL })
			: puppeteer.connect({ browserWSEndpoint: resolved.browserWSEndpoint });
	}
	const args = profile === "trusted" ? TRUSTED_ARGS : SANDBOXED_ARGS;
	return puppeteer.launch({
		headless: true,
		executablePath: resolved.executablePath,
		args,
	});
}

type PoolEntry = {
	browser: Browser | null;
	pending: Promise<Browser> | null;
};

const pool: Record<ChromeProfile, PoolEntry> = {
	sandboxed: { browser: null, pending: null },
	trusted: { browser: null, pending: null },
};

export async function getBrowser(profile: ChromeProfile): Promise<Browser> {
	const entry = pool[profile];
	if (entry.browser?.connected) return entry.browser;
	if (!entry.pending) {
		entry.pending = openBrowser(profile)
			.then((b) => {
				entry.browser = b;
				b.on("disconnected", () => {
					if (entry.browser === b) entry.browser = null;
				});
				return b;
			})
			.finally(() => {
				entry.pending = null;
			});
	}
	return entry.pending;
}

async function closeAll(): Promise<void> {
	const usingRemote = !!(
		process.env.BROWSER_URL || process.env.BROWSER_WS_ENDPOINT
	);
	for (const profile of ["sandboxed", "trusted"] as const) {
		const entry = pool[profile];
		const b = entry.browser;
		if (!b) continue;
		entry.browser = null;
		try {
			if (usingRemote) b.disconnect();
			else await b.close();
		} catch (err) {
			console.error(`[chrome-pool] Error closing ${profile}:`, err);
		}
	}
}

// Register shutdown hooks exactly once per process.
let hooksAttached = false;
function attachShutdownHooks(): void {
	if (hooksAttached) return;
	hooksAttached = true;
	process.once("exit", () => {
		void closeAll();
	});
	process.once("SIGINT", async () => {
		await closeAll();
		process.exit(0);
	});
	process.once("SIGTERM", async () => {
		await closeAll();
		process.exit(0);
	});
}
attachShutdownHooks();
