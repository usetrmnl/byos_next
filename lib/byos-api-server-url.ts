const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export const formatByosApiServerUrlForDevice = (
	url: string,
): {
	displayUrl: string;
	usesLocalhost: boolean;
} => {
	try {
		const parsed = new URL(url);
		const usesLocalhost =
			parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

		if (usesLocalhost) {
			const port = parsed.port || "3000";
			return {
				displayUrl: `http://[your-ip]:${port}`,
				usesLocalhost: true,
			};
		}

		return {
			displayUrl: stripTrailingSlash(url),
			usesLocalhost: false,
		};
	} catch {
		return {
			displayUrl: stripTrailingSlash(url),
			usesLocalhost: false,
		};
	}
};

export const getByosApiServerUrlFromEnv = (): string => {
	const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
	if (raw) {
		return stripTrailingSlash(raw);
	}

	const port = process.env.PORT?.trim() || "3000";
	return `http://localhost:${port}`;
};

export const getByosApiServerUrlFromRequestHeaders = (
	headerList: Headers,
): string => {
	const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
	if (fromEnv) {
		return stripTrailingSlash(fromEnv);
	}

	const proto = headerList.get("x-forwarded-proto") ?? "http";
	const host =
		headerList.get("x-forwarded-host") ??
		headerList.get("host") ??
		`localhost:${process.env.PORT?.trim() || "3000"}`;

	return stripTrailingSlash(`${proto}://${host}`);
};
