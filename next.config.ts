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
	],
};

export default nextConfig;
