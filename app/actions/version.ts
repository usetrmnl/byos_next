"use server";

import { getLatestServerRelease } from "@/lib/server-release";
import packageJson from "@/package.json";
import { compareVersions } from "@/utils/helpers";

export interface ServerUpdateInfo {
	currentVersion: string;
	latestVersion: string;
	isUpdateAvailable: boolean;
	releaseName: string;
	releaseUrl: string;
	releaseNotes: string;
	publishedAt: string;
}

/**
 * Compare the running BYOS version against the latest GitHub release.
 * Returns null when the latest release can't be determined (offline / no repo
 * access) so callers can silently no-op.
 */
export async function getServerUpdateInfo(): Promise<ServerUpdateInfo | null> {
	const release = await getLatestServerRelease();
	if (!release) return null;

	const currentVersion = packageJson.version;

	return {
		currentVersion,
		latestVersion: release.version,
		isUpdateAvailable: compareVersions(currentVersion, release.version) < 0,
		releaseName: release.name,
		releaseUrl: release.htmlUrl,
		releaseNotes: release.body,
		publishedAt: release.publishedAt,
	};
}
