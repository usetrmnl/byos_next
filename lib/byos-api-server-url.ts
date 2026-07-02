export type DeviceApiServerUrlInfo = {
	displayUrl: string;
	canCopy: boolean;
	needsManualLanIp: boolean;
};

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

const getConfiguredBaseUrl = (): string | null => {
	const candidates: Array<string | undefined> = [
		process.env.NEXT_PUBLIC_BASE_URL,
		process.env.BETTER_AUTH_URL,
		process.env.VERCEL_PROJECT_PRODUCTION_URL &&
			`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
		process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
	];

	for (const candidate of candidates) {
		const raw = candidate?.trim();
		if (raw && URL.canParse(raw)) {
			return stripTrailingSlash(raw);
		}
	}

	return null;
};

export const isLocalhostHostname = (hostname: string): boolean =>
	hostname === "localhost" || hostname === "127.0.0.1";

export const getByosApiServerUrlFromEnv = (): string => {
	const configured = getConfiguredBaseUrl();
	if (configured) {
		return configured;
	}

	const port = process.env.PORT?.trim() || "3000";
	return `http://localhost:${port}`;
};

export const getByosApiServerUrlFromRequestHeaders = (
	headerList: Headers,
): string => {
	const configured = getConfiguredBaseUrl();
	if (configured) {
		return configured;
	}

	const proto = headerList.get("x-forwarded-proto") ?? "http";
	const host =
		headerList.get("x-forwarded-host") ??
		headerList.get("host") ??
		`localhost:${process.env.PORT?.trim() || "3000"}`;

	return stripTrailingSlash(`${proto}://${host}`);
};
