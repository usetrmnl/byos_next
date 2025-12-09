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
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Mark @takumi-rs packages as external for server-side bundling
			// These are native Node.js modules that cannot be bundled
			const originalExternal = config.externals;
			config.externals = [
				...(Array.isArray(originalExternal) ? originalExternal : [originalExternal]),
				"@takumi-rs/core",
				"@takumi-rs/helpers",
			].filter(Boolean);
		}
		return config;
	},
};

export default nextConfig;
