import { cloneElement, type ReactElement } from "react";
import { z } from "zod";
import {
	BitmapMarker,
	bitmapSizeFromTarget,
} from "@/components/bitmap-font/bitmap-marker";
import {
	ScreenFooter,
	StatsGrid,
	screenMetric,
} from "@/components/trmnl/screen-layout";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { RecipeDefinition } from "@/lib/recipes/types";
import {
	createScreenProfile,
	type ScreenProfile,
} from "@/lib/trmnl/screen-profile";
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
	latitude: z
		.number()
		.default(0)
		.describe(
			"Optional exact latitude; when set with longitude, skips geocoding",
		)
		.meta({ title: "Latitude" }),
	longitude: z
		.number()
		.default(0)
		.describe(
			"Optional exact longitude; when set with latitude, skips geocoding",
		)
		.meta({ title: "Longitude" }),
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
	suggestion: z.string().default(""),
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
	suggestion?: string;
	width?: number;
	height?: number;
	screen?: ScreenProfile;
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
	suggestion: _suggestion = "",
	width = DEFAULT_IMAGE_WIDTH,
	height = DEFAULT_IMAGE_HEIGHT,
	screen,
}: WeatherProps) {
	const screenProfile = screen ?? createScreenProfile({ width, height });
	const weatherStats = [
		{ label: "Feels Like", value: `${feelsLike}°C`, icon: tempIcon },
		{ label: "Humidity", value: `${humidity}%`, icon: humidityIcon },
		{ label: "Wind Speed", value: `${windSpeed} km/h`, icon: windIcon },
		{ label: "Pressure", value: `${pressure} hPa`, icon: pressureIcon },
		{ label: "Sunrise", value: `${sunrise}`, icon: sunriseIcon },
		{ label: "Sunset", value: `${sunset}`, icon: sunsetIcon },
	];

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
		return CloudIcon;
	};

	const isHalfScreen = screenProfile.isHalfScreen;
	const heroTempSize = screenMetric(
		screenProfile,
		isHalfScreen ? 88 : screenProfile.isLarge ? 128 : 108,
	);
	const highLowSize = bitmapSizeFromTarget(
		screenMetric(
			screenProfile,
			isHalfScreen ? 32 : screenProfile.isLarge ? 40 : 34,
		),
		0.7,
	);
	const statIconSize = screenMetric(screenProfile, isHalfScreen ? 36 : 40);
	const headerPad = screenMetric(screenProfile, isHalfScreen ? 12 : 16);
	const bodyPad = screenMetric(screenProfile, isHalfScreen ? 12 : 16);
	const statGridGap = screenMetric(screenProfile, isHalfScreen ? 10 : 12);
	const statLabelSize = screenMetric(screenProfile, isHalfScreen ? 18 : 20);
	const statTextGap = screenMetric(screenProfile, isHalfScreen ? 4 : 5);
	const statIconGap = screenMetric(screenProfile, isHalfScreen ? 8 : 10);
	const sizeIcon = (icon: ReactElement, base: number) => {
		const px = screenMetric(screenProfile, base);
		return cloneElement(
			icon as ReactElement<{ width?: number; height?: number }>,
			{ width: px, height: px },
		);
	};

	return (
		<PreSatori
			width={screenProfile.logicalWidth}
			height={screenProfile.logicalHeight}
		>
			<div className="flex flex-col w-full h-full bg-white text-black overflow-hidden">
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						padding: headerPad,
						gap: screenMetric(screenProfile, 8),
						minWidth: 0,
						overflow: "hidden",
					}}
				>
					<div style={{ display: "flex", flex: "none", minWidth: 0 }}>
						<BitmapMarker text={`${temperature}°C`} sizePx={heroTempSize} />
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							flex: "1 1 auto",
							minWidth: 0,
							overflow: "hidden",
						}}
					>
						<div style={{ display: "flex", alignItems: "center" }}>
							{sizeIcon(getWeatherIcon(description), isHalfScreen ? 96 : 112)}
						</div>
						{!isHalfScreen && (
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									gap: screenMetric(screenProfile, 4),
									marginTop: screenMetric(screenProfile, 8),
									minWidth: 0,
									overflow: "hidden",
								}}
							>
								{sizeIcon(tempUp, 28)}
								<BitmapMarker text={`${highTemp}°C`} sizePx={highLowSize} />
								{sizeIcon(tempDown, 28)}
								<BitmapMarker text={`${lowTemp}°C`} sizePx={highLowSize} />
							</div>
						)}
					</div>
				</div>
				<div
					style={{
						display: "flex",
						flex: 1,
						flexDirection: "column",
						minHeight: 0,
						padding: bodyPad,
						paddingTop: 0,
					}}
				>
					<StatsGrid
						screen={screenProfile}
						bitmap
						bitmapLabelFont="geneva12"
						gapSize={statGridGap}
						bitmapTextGap={statTextGap}
						bitmapIconGap={statIconGap}
						labelSize={statLabelSize}
						stats={weatherStats.map((stat) => ({
							label: stat.label,
							value: stat.value,
							icon: sizeIcon(stat.icon, statIconSize),
						}))}
						columns={isHalfScreen ? 2 : 3}
					/>
					<div style={{ flex: 1, minHeight: 0 }} />
					<ScreenFooter
						screen={screenProfile}
						bitmap
						left={location}
						right={lastUpdated ? `Updated ${lastUpdated}` : ""}
					/>
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
		const data = await getWeatherDataInternal({
			location: params.location,
			latitude: params.latitude,
			longitude: params.longitude,
		});
		return data as z.infer<typeof dataSchema>;
	},
	Component: ({ width, height, screen, data }) => (
		<Weather {...data} width={width} height={height} screen={screen} />
	),
};
