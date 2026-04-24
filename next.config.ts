import { existsSync } from "fs";
import type { NextConfig } from "next";

const serverExternalPackages = ["@takumi-rs/core", "@takumi-rs/helpers"];

const browserTracingIncludes = [];

// Detect which optional browser packages are installed at build time.
if (existsSync("node_modules/puppeteer-core")) {
	serverExternalPackages.push("puppeteer-core");
	browserTracingIncludes.push("./node_modules/puppeteer-core/**/*");
}

if (existsSync("node_modules/puppeteer")) {
	serverExternalPackages.push("puppeteer");
	browserTracingIncludes.push("./node_modules/puppeteer/**/*");
}

const nextConfig: NextConfig = {
	/* config options here */
	trailingSlash: false,
	skipTrailingSlashRedirect: true,
	cacheComponents: true,
	output: "standalone",
	// Mark native modules as external for server components
	serverExternalPackages,
	...(browserTracingIncludes.length > 0 && {
		outputFileTracingIncludes: {
			"/**": browserTracingIncludes,
		},
	}),
};

export default nextConfig;
