import { unstable_cache } from "next/cache";

// Export config to mark this component as dynamic
export const dynamic = "force-dynamic";

interface WeatherData {
	temperature: string;
	feelsLike: string;
	humidity: string;
	windSpeed: string;
	description: string;
	location: string;
	lastUpdated: string;
	highTemp: string;
	lowTemp: string;
	pressure: string;
	sunset: string;
	sunrise: string;
	latitude: number;
	longitude: number;
}

interface GeocodingResponse {
	results: Array<{
		name: string;
		country: string;
		latitude: number;
		longitude: number;
	}>;
}

interface OpenMeteoResponse {
	current: {
		time: string;
		temperature_2m: number;
		apparent_temperature: number;
		relative_humidity_2m: number;
		wind_speed_10m: number;
		surface_pressure: number;
		weather_code: number;
	};
	daily: {
		time: string[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
		sunset: string[];
		sunrise: string[];
	};
}

/**
 * Convert weather code to description
 */
function getWeatherDescription(code: number): string {
	const weatherCodes: { [key: number]: string } = {
		0: "Clear sky",
		1: "Mainly clear",
		2: "Partly cloudy",
		3: "Overcast",
		45: "Foggy",
		48: "Depositing rime fog",
		51: "Light drizzle",
		53: "Moderate drizzle",
		55: "Dense drizzle",
		56: "Light freezing drizzle",
		57: "Dense freezing drizzle",
		61: "Slight rain",
		63: "Moderate rain",
		65: "Heavy rain",
		66: "Light freezing rain",
		67: "Heavy freezing rain",
		71: "Slight snow fall",
		73: "Moderate snow fall",
		75: "Heavy snow fall",
		77: "Snow grains",
		80: "Slight rain showers",
		81: "Moderate rain showers",
		82: "Violent rain showers",
		85: "Slight snow showers",
		86: "Heavy snow showers",
		95: "Thunderstorm",
		96: "Thunderstorm with slight hail",
		99: "Thunderstorm with heavy hail",
	};
	return weatherCodes[code] || "Unknown";
}

/**
 * Geocode a location name to coordinates
 */
async function geocodeLocation(
	locationName: string,
): Promise<{ latitude: number; longitude: number; name: string } | null> {
	try {
		const response = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`,
			{
				headers: {
					Accept: "application/json",
				},
				next: { revalidate: 0 },
			},
		);

		if (!response.ok) {
			throw new Error(
				`Geocoding API responded with status: ${response.status}`,
			);
		}

		const data: GeocodingResponse = await response.json();

		if (data.results && data.results.length > 0) {
			const result = data.results[0];
			return {
				latitude: result.latitude,
				longitude: result.longitude,
				name: `${result.name}, ${result.country}`,
			};
		}

		return null;
	} catch (error) {
		console.error("Error geocoding location:", error);
		return null;
	}
}

/**
 * Internal function to fetch and process weather data
 */
async function getWeatherData(
	latitude?: number,
	longitude?: number,
	locationName?: string,
): Promise<WeatherData | null> {
	try {
		if ((!latitude || !longitude) && !locationName) {
			throw new Error("Latitude, longitude, or location name are required");
		}

		if (locationName) {
			const geocoded = await geocodeLocation(locationName);
			if (geocoded) {
				latitude = geocoded.latitude;
				longitude = geocoded.longitude;
			}
		}

		// Fetch weather data from Open-Meteo API
		const response = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&daily=temperature_2m_max,temperature_2m_min,sunset,sunrise&timezone=auto`,
			{
				headers: {
					Accept: "application/json",
				},
				next: { revalidate: 0 },
			},
		);

		if (!response.ok) {
			throw new Error(
				`Open-Meteo API responded with status: ${response.status}`,
			);
		}

		const data: OpenMeteoResponse = await response.json();

		// Format the data
		const formatTemperature = (temp: number): string => {
			return Math.round(temp).toString();
		};

		const formatHumidity = (humidity: number): string => {
			return Math.round(humidity).toString();
		};

		const formatWindSpeed = (speed: number): string => {
			return Math.round(speed).toString();
		};

		const formatPressure = (pressure: number): string => {
			return Math.round(pressure).toString();
		};

		const formatTime = (timeString: string): string => {
			const date = new Date(timeString);
			return date.toLocaleString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			});
		};

		// Format the date
		const formatDate = (dateString: string): string => {
			const date = new Date(dateString);
			return date.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		};

		// Check if we have valid current data
		if (!data.current) {
			throw new Error("No current weather data available");
		}

		const current = data.current;
		const daily = data.daily;

		return {
			temperature: formatTemperature(current.temperature_2m),
			feelsLike: formatTemperature(current.apparent_temperature),
			humidity: formatHumidity(current.relative_humidity_2m),
			windSpeed: formatWindSpeed(current.wind_speed_10m),
			description: getWeatherDescription(current.weather_code),
			location: locationName || "San Francisco, CA",
			lastUpdated: formatDate(current.time),
			highTemp: formatTemperature(daily.temperature_2m_max[0]),
			lowTemp: formatTemperature(daily.temperature_2m_min[0]),
			pressure: formatPressure(current.surface_pressure),
			sunset: formatTime(daily.sunset[0]),
			sunrise: formatTime(daily.sunrise[0]),
			latitude: latitude || 0,
			longitude: longitude || 0,
		};
	} catch (error) {
		console.error("Error fetching weather data:", error);
		return null;
	}
}

/**
 * Function that fetches weather data without caching
 */
async function fetchWeatherDataNoCache(
	latitude?: number,
	longitude?: number,
	locationName?: string,
): Promise<WeatherData> {
	const data = await getWeatherData(latitude, longitude, locationName);

	// If data is null or empty, return a default object
	if (!data) {
		return {
			temperature: "N/A",
			feelsLike: "N/A",
			humidity: "N/A",
			windSpeed: "N/A",
			description: "N/A",
			location: "N/A",
			lastUpdated: "N/A",
			highTemp: "N/A",
			lowTemp: "N/A",
			pressure: "N/A",
			sunset: "N/A",
			sunrise: "N/A",
			latitude: latitude || 0,
			longitude: longitude || 0,
		};
	}

	return data;
}

/**
 * Cached function that serves as the entry point for fetching weather data
 * Only caches valid responses
 */
const getCachedWeatherData = unstable_cache(
	async (
		latitude?: number,
		longitude?: number,
		locationName?: string,
	): Promise<WeatherData> => {
		const data = await getWeatherData(latitude, longitude, locationName);

		// If data is null or empty, throw an error to prevent caching
		if (!data) {
			throw new Error("Empty or invalid data - skip caching");
		}

		return data;
	},
	["weather-data"],
	{
		tags: ["weather", "open-meteo"],
		revalidate: 900, // Cache for 15 minutes (weather doesn't change as frequently as crypto)
	},
);

/**
 * Main export function that tries to use cached data but falls back to non-cached data if needed
 */
export default async function getData(): Promise<WeatherData> {
	const locationName = "San Francisco";
	const latitude = undefined;
	const longitude = undefined;

	let finalLatitude: number | undefined = latitude;
	let finalLongitude: number | undefined = longitude;
	let finalLocationName = locationName;

	try {
		// If location name is provided but no coordinates, try to geocode
		if (locationName && !latitude && !longitude) {
			const geocoded = await geocodeLocation(locationName);
			if (geocoded) {
				finalLatitude = geocoded.latitude;
				finalLongitude = geocoded.longitude;
				finalLocationName = geocoded.name;
			}
		}

		// Try to get cached data first
		return await getCachedWeatherData(
			finalLatitude,
			finalLongitude,
			finalLocationName,
		);
	} catch (error) {
		console.log("Cache skipped or error:", error);
		// Fall back to non-cached data
		console.log(
			"Fallback to non-cached data: ",
			finalLatitude,
			finalLongitude,
			finalLocationName,
		);
		return fetchWeatherDataNoCache(
			finalLatitude,
			finalLongitude,
			finalLocationName,
		);
	}
}
