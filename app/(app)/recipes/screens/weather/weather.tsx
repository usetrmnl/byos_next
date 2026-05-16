import { PreSatori } from "@/utils/pre-satori";
import {
	CloudIcon,
	FogIcon,
	HumidityIcon,
	PressureIcon,
	RainIcon,
	SnowIcon,
	SunIcon,
	SunriseIcon,
	SunsetIcon,
	ThunderIcon,
	TempDown,
	TempIcon,
	TempUp,
	WindIcon,
} from "./icons";

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
	const isNarrow = width < 350;
	const isCompact = width < 600;

	const iconSize = isNarrow ? 64 : isCompact ? 96 : 128;
	const statIconSize = isNarrow ? 32 : isCompact ? 40 : 48;

	const weatherStats = [
		{ label: "Feels Like", value: `${feelsLike}°C`, icon: <TempIcon size={statIconSize} /> },
		{ label: "Humidity", value: `${humidity}%`, icon: <HumidityIcon size={statIconSize} /> },
		{ label: "Wind Speed", value: `${windSpeed} km/h`, icon: <WindIcon size={statIconSize} /> },
		{ label: "Pressure", value: `${pressure} hPa`, icon: <PressureIcon size={statIconSize} /> },
		{ label: "Sunrise", value: `${sunrise}`, icon: <SunriseIcon size={statIconSize} /> },
		{ label: "Sunset", value: `${sunset}`, icon: <SunsetIcon size={statIconSize} /> },
	];

	const getWeatherIcon = (desc: string, size: number) => {
		const lowerDesc = desc.toLowerCase();
		if (lowerDesc.includes("rain") || lowerDesc.includes("drizzle")) return <RainIcon size={size} />;
		if (lowerDesc.includes("snow")) return <SnowIcon size={size} />;
		if (lowerDesc.includes("cloud")) return <CloudIcon size={size} />;
		if (lowerDesc.includes("clear") || lowerDesc.includes("sun")) return <SunIcon size={size} />;
		if (lowerDesc.includes("fog") || lowerDesc.includes("mist")) return <FogIcon size={size} />;
		if (lowerDesc.includes("thunder")) return <ThunderIcon size={size} />;
		return <CloudIcon size={size} />;
	};

	const headerPadding = isNarrow ? "p-2" : "p-4";
	const tempClass = isNarrow ? "text-5xl" : isCompact ? "text-7xl" : "text-9xl";
	const statsGridClass = isNarrow
		? "grid-cols-2 gap-1"
		: isCompact
		? "grid-cols-2 gap-2"
		: "grid-cols-3 gap-4";
	const statPadding = isNarrow ? "p-1" : "p-2";
	const statTextClass = isNarrow ? "text-xs" : isCompact ? "text-xl" : "text-3xl";
	const footerClass = isNarrow
		? "flex-col text-xs p-1"
		: isCompact
		? "flex-col text-lg p-2"
		: "flex-row justify-between text-2xl p-2";
	const outerPadding = isNarrow ? "p-2" : "p-4";

	return (
		<PreSatori width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white text-black">
				<div className={`flex flex-row ${headerPadding} items-center justify-between`}>
					<h2 className={`font-inter ${tempClass}`}>
						{temperature}°C
					</h2>
					<div className="flex flex-col items-center justify-center">
						{getWeatherIcon(description, iconSize)}
						{!isCompact && (
							<div className="text-4xl mt-4 font-blockkie">
								<div className="flex flex-row items-center">
									<TempUp /> {highTemp}°C
									<TempDown /> {lowTemp}°C
								</div>
							</div>
						)}
					</div>
				</div>
				<div className={`${outerPadding} flex flex-col flex-1`}>
					<div className={`w-full flex-1 mb-4 grid ${statsGridClass}`}>
						{weatherStats.map((stat, index) => (
							<div
								key={index}
								className="rounded-xl border border-black flex-1 flex flex-row items-center"
							>
								<div className={`${statPadding} max-h-16`}>{stat.icon}</div>
								<div className="flex flex-col ml-1">
									<div className={`leading-none m-0 ${statTextClass}`}>
										{stat.label}
									</div>
									<div className={`leading-none m-0 ${statTextClass}`}>
										{stat.value}
									</div>
								</div>
							</div>
						))}
					</div>
					<div className={`w-full flex ${footerClass} items-center text-white rounded-xl bg-gray-500`}>
						<div>{location}</div>
						<div>{lastUpdated && <span>Last updated: {lastUpdated}</span>}</div>
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
