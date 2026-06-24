import type { PlaylistItem } from "@/lib/types";

export type PlaylistScreen = {
	screen: string;
	duration: number;
};

export function sortPlaylistItems(items: PlaylistItem[]): PlaylistItem[] {
	return [...items].sort((a, b) => a.order_index - b.order_index);
}

export function getPlaylistScreens(
	items: PlaylistItem[],
	playlistId: string | null | undefined,
): PlaylistScreen[] {
	if (!playlistId) return [];
	return sortPlaylistItems(
		items.filter((item) => item.playlist_id === playlistId),
	).map((item) => ({
		screen: item.screen_id,
		duration: item.duration,
	}));
}

export function getFirstPlaylistScreenId(
	items: PlaylistItem[],
	playlistId: string | null | undefined,
): string | null {
	return getPlaylistScreens(items, playlistId)[0]?.screen ?? null;
}

export function buildFirstScreenByPlaylistId(
	items: PlaylistItem[],
): Record<string, string> {
	return sortPlaylistItems(items).reduce<Record<string, string>>(
		(acc, item) => {
			if (item.playlist_id && !acc[item.playlist_id]) {
				acc[item.playlist_id] = item.screen_id;
			}
			return acc;
		},
		{},
	);
}
