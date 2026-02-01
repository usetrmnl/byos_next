import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	trailingSlash: false,
	skipTrailingSlashRedirect: true,
	cacheComponents: true,
	output: "standalone",
	// Mark native modules as external for server components
	serverExternalPackages: [
		"@takumi-rs/core",
		"@takumi-rs/helpers",
		"@sparticuz/chromium-min",
		"puppeteer-core",
	],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "raw.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "github.com",
			},
			{
				protocol: "https",
				hostname: "*.github.io",
			},
			{
				protocol: "https",
				hostname: "trmnl.com",
			},
			{
				protocol: "https",
				hostname: "usetrmnl.com",
			},
			{
				protocol: "https",
				hostname: "trmnl.s3.us-east-2.amazonaws.com",
			},
			{
				protocol: "https",
				hostname: "trmnl-public.s3.us-east-2.amazonaws.com",
			},
			// Not safe
			{
				protocol: "https",
				hostname: "*",
			}
		],
	},
};

export default nextConfig;
