import { z } from "zod";
import type { RecipeDefinition } from "@/lib/recipes/types";
import { PreSatori } from "@/utils/pre-satori";
import getWeatherDataInternal from "./getData";
import {
	CloudIcon,
	FogIcon,
	humidityIcon,
	pressureIcon,
	RainIcon,
	SnowIcon,
	SunIcon,
	sunriseIcon,
	sunsetIcon,
	ThunderIcon,
	tempDown,
	tempIcon,
	tempUp,
	windIcon,
} from "./icons";

export const paramsSchema = z.object({
	location: z
		.string()
		.default("San Francisco")
		.describe("City or place name to fetch weather for")
		.meta({ title: "Location", placeholder: "San Francisco" }),
});

export const dataSchema = z.object({
	temperature: z.string().default("Loading..."),
	feelsLike: z.string().default("Loading..."),
	humidity: z.string().default("Loading..."),
	windSpeed: z.string().default("Loading..."),
	description: z.string().default("Loading..."),
	location: z.string().default("Loading..."),
	lastUpdated: z.string().default("Loading..."),
	highTemp: z.string().default("Loading..."),
	lowTemp: z.string().default("Loading..."),
	pressure: z.string().default("Loading..."),
	sunset: z.string().default("Loading..."),
	sunrise: z.string().default("Loading..."),
	latitude: z.number().default(0),
	longitude: z.number().default(0),
});

interface WeatherProps {
	temperature?: string;
	feelsLike?: string;
	humidity?: string;
	windSpeed?: string;
	description?: string;
	location?: string;
	lastUpdated?: string;
	highTemp?: string;
	lowTemp?: string;
	pressure?: string;
	sunset?: string;
	sunrise?: string;
	latitude?: number;
	longitude?: number;
	width?: number;
	height?: number;
}

export default function Weather({
	temperature = "Loading...",
	feelsLike = "Loading...",
	humidity = "Loading...",
	windSpeed = "Loading...",
	description = "Loading...",
	location = "Loading...",
	lastUpdated = "Loading...",
	highTemp = "Loading...",
	lowTemp = "Loading...",
	pressure = "Loading...",
	sunset = "Loading...",
	sunrise = "Loading...",
	width = 800,
	height = 480,
}: WeatherProps) {
	// Weather statistics
	const weatherStats = [
		{ label: "Feels Like", value: `${feelsLike}°C`, icon: tempIcon },
		{ label: "Humidity", value: `${humidity}%`, icon: humidityIcon },
		{ label: "Wind Speed", value: `${windSpeed} km/h`, icon: windIcon },
		{ label: "Pressure", value: `${pressure} hPa`, icon: pressureIcon },
		{ label: "Sunrise", value: `${sunrise}`, icon: sunriseIcon },
		{ label: "Sunset", value: `${sunset}`, icon: sunsetIcon },
	];

	// Get weather icon based on description
	const getWeatherIcon = (desc: string) => {
		const lowerDesc = desc.toLowerCase();
		if (lowerDesc.includes("rain") || lowerDesc.includes("drizzle"))
			return RainIcon;
		if (lowerDesc.includes("snow")) return SnowIcon;
		if (lowerDesc.includes("cloud")) return CloudIcon;
		if (lowerDesc.includes("clear") || lowerDesc.includes("sun"))
			return SunIcon;
		if (lowerDesc.includes("fog") || lowerDesc.includes("mist")) return FogIcon;
		if (lowerDesc.includes("thunder")) return ThunderIcon;
		return CloudIcon; // default
	};

	const isHalfScreen = width === 400 && height === 480;

	return (
		<PreSatori width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white text-black">
				<div
					className={`flex p-4 sm:flex-row items-center justify-between ${isHalfScreen ? "flex-row" : "flex-col sm:flex-row"}`}
				>
					<h2
						className={`font-inter ${isHalfScreen ? "text-8xl" : "text-9xl"}`}
					>
						{temperature}°C
					</h2>
					<div className="flex flex-col items-center justify-center">
						{getWeatherIcon(description)}
						{!isHalfScreen && (
							<div className="text-4xl mt-4 font-blockkie">
								<div className="flex flex-row items-center">
									{tempUp} {highTemp}°C
									{tempDown} {lowTemp}°C
								</div>
							</div>
						)}
					</div>
				</div>
				<div className="p-4 flex flex-col flex-1">
					<div
						className={`w-full flex flex-col flex-1 mb-4 ${isHalfScreen ? "gap-2" : "gap-4"} grid grid-cols-2 sm:grid-cols-3`}
					>
						{weatherStats.map((stat, index) => (
							<div
								key={index}
								className=" rounded-xl border border-black flex-1 flex flex-row items-center"
							>
								<div className="p-2 max-h-16">{stat.icon}</div>
								<div className="flex flex-col sm:ml-2">
									<div
										className={`leading-none m-0 ${isHalfScreen ? "text-2xl" : "text-3xl"}`}
									>
										{stat.label}
									</div>
									<div
										className={`leading-none m-0 ${isHalfScreen ? "text-2xl" : "text-3xl"}`}
									>
										{stat.value}
									</div>
								</div>
							</div>
						))}
					</div>
					<div className="w-full flex flex-col sm:flex-row  sm:justify-between items-center text-2xl text-white p-2 rounded-xl bg-gray-500">
						<div>{location}</div>
						<div>{lastUpdated && <span>Last updated: {lastUpdated}</span>}</div>
					</div>
				</div>
			</div>
		</PreSatori>
	);
}

export const definition: RecipeDefinition<
	typeof paramsSchema,
	typeof dataSchema
> = {
	meta: {
		slug: "weather",
		title: "Weather Forecast",
		description:
			"A component that displays current weather data from Open-Meteo API. Supports configurable locations via latitude/longitude or location name.",
		published: true,
		tags: ["tailwind", "weather", "api", "live-data", "configurable"],
		author: { name: "rbouteiller", github: "" },
		category: "display-components",
		version: "0.1.0",
		createdAt: "2025-03-01T00:00:00Z",
		updatedAt: "2025-03-01T00:00:00Z",
	},
	paramsSchema,
	dataSchema,
	getData: async (params) => {
		const data = await getWeatherDataInternal({ location: params.location });
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, data }) => (
		<Weather {...data} width={width} height={height} />
	),
};
