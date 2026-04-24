/**
 * Screenshot script for byos_next
 *
 * Captures screenshots of all app routes and applies rounded corners + border styling.
 * Uses puppeteer-core (already a project dependency) with local Chrome.
 *
 * Usage:
 *   node scripts/take-screenshots.mjs
 *
 * Environment variables:
 *   SCREENSHOT_EMAIL    - Login email (prompted if not set)
 *   SCREENSHOT_PASSWORD - Login password (prompted if not set)
 *   CHROME_PATH         - Path to Chrome/Chromium binary (auto-detected if not set)
 */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const SCREENSHOT_DIR = join(PROJECT_ROOT, "docs", "screenshots");
const BASE = "http://localhost:3000";

const VIEWPORT = { width: 1920, height: 1080 };
const BORDER_RADIUS = 16;
const GLOW_SIZE = 16;
const PADDING = GLOW_SIZE;

const AUTH_ROUTES = [
  { path: "/sign-in", name: "sign-in" },
  { path: "/sign-up", name: "sign-up" },
  { path: "/recover", name: "recover" },
];

const APP_ROUTES = [
  { path: "/", name: "dashboard" },
  { path: "/catalog", name: "catalog" },
  { path: "/recipes", name: "recipes" },
  { path: "/playlists", name: "playlists" },
  { path: "/tools", name: "tools" },
  { path: "/system-logs", name: "system-logs" },
  { path: "/admin/users", name: "admin-users" },
  { path: "/mixup", name: "mixup" },
];

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getCredentials() {
  const email = process.env.SCREENSHOT_EMAIL || (await prompt("Login email: "));
  const password =
    process.env.SCREENSHOT_PASSWORD || (await prompt("Login password: "));
  return { email, password };
}

/**
 * Apply rounded corners, border, and drop shadow to a screenshot.
 */
async function styleScreenshot(inputPath) {
  const { width, height } = await sharp(inputPath).metadata();

  const totalW = width + PADDING * 2;
  const totalH = height + PADDING * 2;
  const r = BORDER_RADIUS;
  const g = GLOW_SIZE;

  // SVG mask for rounded corners
  const roundedMask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="white"/>
    </svg>`,
  );

  const roundedImg = await sharp(inputPath)
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Build gradient glow using multiple layered rounded rects (no filters needed)
  const steps = g;
  let rects = "";
  for (let i = 0; i < steps; i++) {
    const t = i / steps; // 0 = outermost, 1 = innermost
    const inset = i;
    const opacity = t * 0.35; // light orange fades from 0 at edge to 0.35 near image
    rects += `<rect x="${inset}" y="${inset}" width="${totalW - inset * 2}" height="${totalH - inset * 2}" rx="${r + g - inset}" ry="${r + g - inset}" fill="rgb(251,146,60)" fill-opacity="${opacity}"/>\n`;
  }

  const glowSvg = Buffer.from(
    `<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
      ${rects}
    </svg>`,
  );

  await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: glowSvg, top: 0, left: 0 },
      { input: roundedImg, top: PADDING, left: PADDING },
    ])
    .png()
    .toFile(inputPath);
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { email, password } = await getCredentials();
  const chromePath = findChrome();

  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log(`Launching Chrome from ${chromePath}`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [`--window-size=${VIEWPORT.width},${VIEWPORT.height}`],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
  ]);

  // --- Auth pages ---
  for (const route of AUTH_ROUTES) {
    console.log(`  Capturing ${route.path}`);
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle0" });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${route.name}.png`),
      fullPage: false,
    });
  }

  // --- Sign in ---
  console.log("Signing in...");
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  await delay(1000);

  // Click and type into each field
  await page.click("#email", { clickCount: 3 });
  await page.keyboard.type(email);
  await page.click("#password", { clickCount: 3 });
  await page.keyboard.type(password);

  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);

  await delay(1000);

  if (page.url().includes("sign-in")) {
    console.error("Sign-in failed. Check your credentials.");
    await page.screenshot({ path: join(SCREENSHOT_DIR, "_debug-signin.png") });
    await browser.close();
    process.exit(1);
  }

  console.log(`Signed in. Now at: ${page.url()}`);

  // --- App pages ---
  for (const route of APP_ROUTES) {
    console.log(`  Capturing ${route.path}`);
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle0" });
    await delay(1500);
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${route.name}.png`),
      fullPage: false,
    });
  }

  await browser.close();

  // --- Post-process: round corners + border ---
  const allRoutes = [...AUTH_ROUTES, ...APP_ROUTES];
  console.log("Styling screenshots...");
  for (const route of allRoutes) {
    const filePath = join(SCREENSHOT_DIR, `${route.name}.png`);
    console.log(`  Styling ${route.name}.png`);
    await styleScreenshot(filePath);
  }

  console.log(
    `Done! ${allRoutes.length} screenshots saved to docs/screenshots/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
