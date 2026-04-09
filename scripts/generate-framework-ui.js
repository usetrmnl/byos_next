const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const BASE_URL = "https://trmnl.com";
const CSS_URL = `${BASE_URL}/css/3.0.3/plugins.css`;
const PUBLIC_DIR = path.join(__dirname, "../public");
const OUTPUT_DIR = path.join(PUBLIC_DIR, "/framework-ui");
const CSS_FILE = path.join(OUTPUT_DIR, "plugins.css");

function downloadFile(url, outputPath) {
	return new Promise((resolve, reject) => {
		const protocol = url.startsWith("https") ? https : http;
		console.log(`Downloading: ${url}`);

		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const file = fs.createWriteStream(outputPath);
		protocol
			.get(url, (response) => {
				if (response.statusCode === 301 || response.statusCode === 302) {
					file.close();
					fs.unlinkSync(outputPath);
					downloadFile(response.headers.location, outputPath)
						.then(resolve)
						.catch(reject);
					return;
				}
				if (response.statusCode !== 200) {
					file.close();
					reject(new Error(`HTTP ${response.statusCode}`));
					return;
				}
				response.pipe(file);
				file.on("finish", () => {
					file.close();
					resolve();
				});
			})
			.on("error", (err) => {
				fs.unlinkSync(outputPath);
				reject(err);
			});
	});
}

function extractUrls(cssContent) {
	const urlPattern = /url\((["']?)([^)'"]+)\1\)/g;
	const urls = new Set();
	let match = urlPattern.exec(cssContent);
	while (match !== null) {
		const url = match[2];
		if (
			!url.startsWith("http://") &&
			!url.startsWith("https://")
		) {
			urls.add(url);
		}
		match = urlPattern.exec(cssContent);
	}
	return Array.from(urls);
}

function updateCss(cssContent) {
	// Replace `:root{` with `:root,:host{` so it also works in shadow dom
	cssContent = cssContent.replace(/:root\s*{/g, ":root,:host{");

	// Update URLs to be relative to OUTPUT_DIR
	cssContent = cssContent.replace(
		/url\((["']?)(\/[^)'"]+)\1\)/g,
		`url($1${OUTPUT_DIR.replace(PUBLIC_DIR, '')}$2$1)`,
	);

	return cssContent;
}

async function main() {
	// Create output directory
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Download CSS file
	console.log("Downloading CSS...");
	await downloadFile(CSS_URL, CSS_FILE);

	// Read CSS content
	let cssContent = fs.readFileSync(CSS_FILE, "utf8");

	// Extract URLs
	const urls = extractUrls(cssContent);
	console.log(`Found ${urls.length} URLs to download`);

	// Download all assets
	for (const url of urls) {
		const fullUrl = `${BASE_URL}${url}`;
		const outputPath = path.join(OUTPUT_DIR, url.replace(/^\/+/, ""));
		try {
			await downloadFile(fullUrl, outputPath);
		} catch (err) {
			console.log(`Failed to download ${url}: ${err.message}`);
		}
	}

	// Update CSS with new URLs and :root,:host replacement
	cssContent = updateCss(cssContent);

	// Write updated CSS
	fs.writeFileSync(CSS_FILE, cssContent);

	console.log(`\n✅ Complete! All files in: ${OUTPUT_DIR}`);
	console.log(`✅ CSS file updated with local paths and :root,:host selector`);
}

main().catch((err) => {
	console.error("Script failed:", err);
	process.exit(1);
});
