import os from "node:os";
import "server-only";
import {
	type DeviceApiServerUrlInfo,
	getByosApiServerUrlFromRequestHeaders,
	isLocalhostHostname,
} from "@/lib/byos-api-server-url";

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

const isPrivateIPv4 = (ip: string): boolean =>
	ip.startsWith("192.168.") ||
	ip.startsWith("10.") ||
	/^172\.(1[6-9]|2\d|3[01])\./.test(ip);

const isIPv4Address = (family: string | number): boolean =>
	family === "IPv4" || family === 4;

export const getLocalLanIPv4 = (): string | null => {
	const candidates: string[] = [];

	for (const addresses of Object.values(os.networkInterfaces())) {
		if (!addresses) continue;

		for (const address of addresses) {
			if (!isIPv4Address(address.family) || address.internal) continue;
			candidates.push(address.address);
		}
	}

	return candidates.find((ip) => isPrivateIPv4(ip)) ?? candidates[0] ?? null;
};

export const resolveByosApiServerUrlForDevice = (
	url: string,
): DeviceApiServerUrlInfo => {
	try {
		const parsed = new URL(url);

		if (!isLocalhostHostname(parsed.hostname)) {
			return {
				displayUrl: stripTrailingSlash(url),
				canCopy: true,
				needsManualLanIp: false,
			};
		}

		const port = parsed.port || process.env.PORT?.trim() || "3000";
		const lanIp = getLocalLanIPv4();

		if (lanIp) {
			return {
				displayUrl: `http://${lanIp}:${port}`,
				canCopy: true,
				needsManualLanIp: false,
			};
		}

		return {
			displayUrl: `http://[your-ip]:${port}`,
			canCopy: false,
			needsManualLanIp: true,
		};
	} catch {
		return {
			displayUrl: stripTrailingSlash(url),
			canCopy: true,
			needsManualLanIp: false,
		};
	}
};

export const getDeviceApiServerUrlFromRequest = (
	headerList: Headers,
): DeviceApiServerUrlInfo => {
	const baseUrl = getByosApiServerUrlFromRequestHeaders(headerList);
	return resolveByosApiServerUrlForDevice(baseUrl);
};
