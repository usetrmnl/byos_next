export const ALBUM_CITY_IDS = [
	"london",
	"paris",
	"new_york",
	"tokyo",
	"sydney",
	"san_francisco",
	"berlin",
] as const;

export type AlbumCityId = (typeof ALBUM_CITY_IDS)[number];

export type AlbumCity = {
	label: string;
	timezone: string;
	wikipediaTitle: string;
};

export const ALBUM_CITIES: Record<AlbumCityId, AlbumCity> = {
	london: {
		label: "London",
		timezone: "Europe/London",
		wikipediaTitle: "London",
	},
	paris: {
		label: "Paris",
		timezone: "Europe/Paris",
		wikipediaTitle: "Paris",
	},
	new_york: {
		label: "New York",
		timezone: "America/New_York",
		wikipediaTitle: "New York City",
	},
	tokyo: {
		label: "Tokyo",
		timezone: "Asia/Tokyo",
		wikipediaTitle: "Tokyo",
	},
	sydney: {
		label: "Sydney",
		timezone: "Australia/Sydney",
		wikipediaTitle: "Sydney",
	},
	san_francisco: {
		label: "San Francisco",
		timezone: "America/Los_Angeles",
		wikipediaTitle: "San Francisco",
	},
	berlin: {
		label: "Berlin",
		timezone: "Europe/Berlin",
		wikipediaTitle: "Berlin",
	},
};

export const DEFAULT_ALBUM_CITY_ID: AlbumCityId = "london";

export const getAlbumCity = (id: string | undefined): AlbumCity => {
	if (id && id in ALBUM_CITIES) {
		return ALBUM_CITIES[id as AlbumCityId];
	}
	return ALBUM_CITIES[DEFAULT_ALBUM_CITY_ID];
};
