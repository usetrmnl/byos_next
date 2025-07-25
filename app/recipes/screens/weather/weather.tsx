import { PreSatori } from "@/utils/pre-satori";

const CloudIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="128"
		height="128"
	>
		<path d="M32 400C32 479.5 96.5 544 176 544L480 544C550.7 544 608 486.7 608 416C608 364.4 577.5 319.9 533.5 299.7C540.2 286.6 544 271.7 544 256C544 203 501 160 448 160C430.3 160 413.8 164.8 399.6 173.1C375.5 127.3 327.4 96 272 96C192.5 96 128 160.5 128 240C128 248 128.7 255.9 129.9 263.5C73 282.7 32 336.6 32 400z" />
	</svg>
);
const SunIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="128"
		height="128"
	>
		<path d="M210.2 53.9C217.6 50.8 226 51.7 232.7 56.1L320.5 114.3L408.3 56.1C415 51.7 423.4 50.9 430.8 53.9C438.2 56.9 443.4 63.5 445 71.3L465.9 174.5L569.1 195.4C576.9 197 583.5 202.4 586.5 209.7C589.5 217 588.7 225.5 584.3 232.2L526.1 320L584.3 407.8C588.7 414.5 589.5 422.9 586.5 430.3C583.5 437.7 576.9 443.1 569.1 444.6L465.8 465.4L445 568.7C443.4 576.5 438 583.1 430.7 586.1C423.4 589.1 414.9 588.3 408.2 583.9L320.4 525.7L232.6 583.9C225.9 588.3 217.5 589.1 210.1 586.1C202.7 583.1 197.3 576.5 195.8 568.7L175 465.4L71.7 444.5C63.9 442.9 57.3 437.5 54.3 430.2C51.3 422.9 52.1 414.4 56.5 407.7L114.7 320L56.5 232.2C52.1 225.5 51.3 217.1 54.3 209.7C57.3 202.3 63.9 196.9 71.7 195.4L175 174.6L195.9 71.3C197.5 63.5 202.9 56.9 210.2 53.9zM239.6 320C239.6 275.6 275.6 239.6 320 239.6C364.4 239.6 400.4 275.6 400.4 320C400.4 364.4 364.4 400.4 320 400.4C275.6 400.4 239.6 364.4 239.6 320zM448.4 320C448.4 249.1 390.9 191.6 320 191.6C249.1 191.6 191.6 249.1 191.6 320C191.6 390.9 249.1 448.4 320 448.4C390.9 448.4 448.4 390.9 448.4 320z" />
	</svg>
);
const ThunderIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="128"
		height="128"
	>
		<path d="M160 384C107 384 64 341 64 288C64 245.5 91.6 209.4 129.9 196.8C128.6 190.1 128 183.1 128 176C128 114.1 178.1 64 240 64C283.1 64 320.5 88.3 339.2 124C353.9 106.9 375.7 96 400 96C444.2 96 480 131.8 480 176C480 181.5 479.4 186.8 478.4 192C478.9 192 479.5 192 480 192C533 192 576 235 576 288C576 341 533 384 480 384L160 384zM161.6 452.2C162.7 449.7 165.2 448 168 448C170.8 448 173.3 449.6 174.4 452.2L204.6 520.4C206.8 525.5 208 530.9 208 536.4C208 558.3 189.9 576 168 576C146.1 576 128 558.3 128 536.4C128 530.9 129.2 525.4 131.4 520.4L161.6 452.2zM313.6 452.2C314.7 449.7 317.2 448 320 448C322.8 448 325.3 449.6 326.4 452.2L356.6 520.4C358.8 525.5 360 530.9 360 536.4C360 558.3 341.9 576 320 576C298.1 576 280 558.3 280 536.4C280 530.9 281.2 525.4 283.4 520.4L313.6 452.2zM435.4 520.4L465.6 452.2C466.7 449.7 469.2 448 472 448C474.8 448 477.3 449.6 478.4 452.2L508.6 520.4C510.8 525.5 512 530.9 512 536.4C512 558.3 493.9 576 472 576C450.1 576 432 558.3 432 536.4C432 530.9 433.2 525.4 435.4 520.4z" />
	</svg>
);
const SnowIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="128"
		height="128"
	>
		<path d="M160 384C107 384 64 341 64 288C64 245.5 91.6 209.4 129.9 196.8C128.6 190.1 128 183.1 128 176C128 114.1 178.1 64 240 64C283.1 64 320.5 88.3 339.2 124C353.9 106.9 375.7 96 400 96C444.2 96 480 131.8 480 176C480 181.5 479.4 186.8 478.4 192C478.9 192 479.5 192 480 192C533 192 576 235 576 288C576 341 533 384 480 384L160 384zM161.6 452.2C162.7 449.7 165.2 448 168 448C170.8 448 173.3 449.6 174.4 452.2L204.6 520.4C206.8 525.5 208 530.9 208 536.4C208 558.3 189.9 576 168 576C146.1 576 128 558.3 128 536.4C128 530.9 129.2 525.4 131.4 520.4L161.6 452.2zM313.6 452.2C314.7 449.7 317.2 448 320 448C322.8 448 325.3 449.6 326.4 452.2L356.6 520.4C358.8 525.5 360 530.9 360 536.4C360 558.3 341.9 576 320 576C298.1 576 280 558.3 280 536.4C280 530.9 281.2 525.4 283.4 520.4L313.6 452.2zM435.4 520.4L465.6 452.2C466.7 449.7 469.2 448 472 448C474.8 448 477.3 449.6 478.4 452.2L508.6 520.4C510.8 525.5 512 530.9 512 536.4C512 558.3 493.9 576 472 576C450.1 576 432 558.3 432 536.4C432 530.9 433.2 525.4 435.4 520.4z" />
	</svg>
);
const RainIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="128"
		height="128"
	>
		<path d="M160 384C107 384 64 341 64 288C64 245.5 91.6 209.4 129.9 196.8C128.6 190.1 128 183.1 128 176C128 114.1 178.1 64 240 64C283.1 64 320.5 88.3 339.2 124C353.9 106.9 375.7 96 400 96C444.2 96 480 131.8 480 176C480 181.5 479.4 186.8 478.4 192C478.9 192 479.5 192 480 192C533 192 576 235 576 288C576 341 533 384 480 384L160 384zM161.6 452.2C162.7 449.7 165.2 448 168 448C170.8 448 173.3 449.6 174.4 452.2L204.6 520.4C206.8 525.5 208 530.9 208 536.4C208 558.3 189.9 576 168 576C146.1 576 128 558.3 128 536.4C128 530.9 129.2 525.4 131.4 520.4L161.6 452.2zM313.6 452.2C314.7 449.7 317.2 448 320 448C322.8 448 325.3 449.6 326.4 452.2L356.6 520.4C358.8 525.5 360 530.9 360 536.4C360 558.3 341.9 576 320 576C298.1 576 280 558.3 280 536.4C280 530.9 281.2 525.4 283.4 520.4L313.6 452.2zM435.4 520.4L465.6 452.2C466.7 449.7 469.2 448 472 448C474.8 448 477.3 449.6 478.4 452.2L508.6 520.4C510.8 525.5 512 530.9 512 536.4C512 558.3 493.9 576 472 576C450.1 576 432 558.3 432 536.4C432 530.9 433.2 525.4 435.4 520.4z" />
	</svg>
);
const FogIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="128"
		height="128"
	>
		<path d="M160 384C107 384 64 341 64 288C64 245.5 91.6 209.4 129.9 196.8C128.6 190.1 128 183.1 128 176C128 114.1 178.1 64 240 64C283.1 64 320.5 88.3 339.2 124C353.9 106.9 375.7 96 400 96C444.2 96 480 131.8 480 176C480 181.5 479.4 186.8 478.4 192C478.9 192 479.5 192 480 192C533 192 576 235 576 288C576 341 533 384 480 384L160 384zM161.6 452.2C162.7 449.7 165.2 448 168 448C170.8 448 173.3 449.6 174.4 452.2L204.6 520.4C206.8 525.5 208 530.9 208 536.4C208 558.3 189.9 576 168 576C146.1 576 128 558.3 128 536.4C128 530.9 129.2 525.4 313.6 452.2zM313.6 452.2C314.7 449.7 317.2 448 320 448C322.8 448 325.3 449.6 326.4 452.2L356.6 520.4C358.8 525.5 360 530.9 360 536.4C360 558.3 341.9 576 320 576C298.1 576 280 558.3 280 536.4C280 530.9 281.2 525.4 283.4 520.4L313.6 452.2zM435.4 520.4L465.6 452.2C466.7 449.7 469.2 448 472 448C474.8 448 477.3 449.6 478.4 452.2L508.6 520.4C510.8 525.5 512 530.9 512 536.4C512 558.3 493.9 576 472 576C450.1 576 432 558.3 432 536.4C432 530.9 433.2 525.4 435.4 520.4z" />
	</svg>
);

const tempUp = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="40"
		height="40"
	>
		<path d="M128.5 160C128.5 107 171.5 64 224.5 64C277.5 64 320.5 107 320.5 160L320.5 324.7C350 351.1 368.5 389.4 368.5 432C368.5 511.5 304 576 224.5 576C145 576 80.5 511.5 80.5 432C80.5 389.4 99 351 128.5 324.7L128.5 160zM224.5 496C259.8 496 288.5 467.3 288.5 432C288.5 405.1 272 382.1 248.5 372.7L248.5 160C248.5 146.7 237.8 136 224.5 136C211.2 136 200.5 146.7 200.5 160L200.5 372.7C177 382.2 160.5 405.2 160.5 432C160.5 467.3 189.2 496 224.5 496zM503.1 73.4L567.1 137.4C579.6 149.9 579.6 170.2 567.1 182.7C554.6 195.2 534.3 195.2 521.8 182.7L512.4 173.3L512.4 352C512.4 369.7 498.1 384 480.4 384C462.7 384 448.4 369.7 448.4 352L448.4 173.3L439 182.7C426.5 195.2 406.2 195.2 393.7 182.7C381.2 170.2 381.2 149.9 393.7 137.4L457.7 73.4C463.7 67.4 471.8 64 480.3 64C488.8 64 496.9 67.4 502.9 73.4z" />
	</svg>
);
const tempDown = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 640 640"
		width="40"
		height="40"
	>
		<path d="M128.5 160C128.5 107 171.5 64 224.5 64C277.5 64 320.5 107 320.5 160L320.5 324.7C350 351.1 368.5 389.4 368.5 432C368.5 511.5 304 576 224.5 576C145 576 80.5 511.5 80.5 432C80.5 389.4 99 351 128.5 324.7L128.5 160zM224.5 496C259.8 496 288.5 467.3 288.5 432C288.5 405.1 272 382.1 248.5 372.7L248.5 344C248.5 330.7 237.8 320 224.5 320C211.2 320 200.5 330.7 200.5 344L200.5 372.7C177 382.2 160.5 405.2 160.5 432C160.5 467.3 189.2 496 224.5 496zM503.1 374.6C497.1 380.6 489 384 480.5 384C472 384 463.9 380.6 457.9 374.6L393.9 310.6C381.4 298.1 381.4 277.8 393.9 265.3C406.4 252.8 426.7 252.8 439.2 265.3L448.6 274.7L448.6 96C448.6 78.3 462.9 64 480.6 64C498.3 64 512.6 78.3 512.6 96L512.6 274.7L522 265.3C534.5 252.8 554.8 252.8 567.3 265.3C579.8 277.8 579.8 298.1 567.3 310.6L503.3 374.6z" />
	</svg>
);

const sunsetIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 16 16"
	>
		<path d="M7.646 4.854a.5.5 0 0 0 .708 0l1.5-1.5a.5.5 0 0 0-.708-.708l-.646.647V1.5a.5.5 0 0 0-1 0v1.793l-.646-.647a.5.5 0 1 0-.708.708zm-5.303-.51a.5.5 0 0 1 .707 0l1.414 1.413a.5.5 0 0 1-.707.707L2.343 5.05a.5.5 0 0 1 0-.707zm11.314 0a.5.5 0 0 1 0 .706l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zM8 7a3 3 0 0 1 2.599 4.5H5.4A3 3 0 0 1 8 7m3.71 4.5a4 4 0 1 0-7.418 0H.499a.5.5 0 0 0 0 1h15a.5.5 0 0 0 0-1h-3.79zM0 10a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 0 10m13 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5" />
	</svg>
);
const sunriseIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 16 16"
	>
		<path d="M7.646 1.146a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 0 1-.708.708L8.5 2.707V4.5a.5.5 0 0 1-1 0V2.707l-.646.647a.5.5 0 1 1-.708-.708zM2.343 4.343a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 0 1-.707.707L2.343 5.05a.5.5 0 0 1 0-.707m11.314 0a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0M8 7a3 3 0 0 1 2.599 4.5H5.4A3 3 0 0 1 8 7m3.71 4.5a4 4 0 1 0-7.418 0H.499a.5.5 0 0 0 0 1h15a.5.5 0 0 0 0-1h-3.79zM0 10a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 0 10m13 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5" />
	</svg>
);

const windIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M12.8 19.6A2 2 0 1 0 14 16H2" />
		<path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" />
		<path d="M9.8 4.4A2 2 0 1 1 11 8H2" />
	</svg>
);
const tempIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
	</svg>
);
const pressureIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M10 2v8" />
		<path d="M12.8 21.6A2 2 0 1 0 14 18H2" />
		<path d="M17.5 10a2.5 2.5 0 1 1 2 4H2" />
		<path d="m6 6 4 4 4-4" />
	</svg>
);
const humidityIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 -960 960 960"
	>
		<path d="M580-240q25 0 42.5-17.5T640-300t-17.5-42.5T580-360t-42.5 17.5T520-300t17.5 42.5T580-240m-202-2 260-260-56-56-260 260zm2-198q25 0 42.5-17.5T440-500t-17.5-42.5T380-560t-42.5 17.5T320-500t17.5 42.5T380-440M480-80q-137 0-228.5-94T160-408q0-100 79.5-217.5T480-880q161 137 240.5 254.5T800-408q0 140-91.5 234T480-80m0-80q104 0 172-70.5T720-408q0-73-60.5-165T480-774Q361-665 300.5-573T240-408q0 107 68 177.5T480-160m0-320" />
	</svg>
);
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

	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px] bg-white">
							<div className="flex-1 overflow-hidden p-4 flex flex-col">
								<div className="flex items-center justify-between">
									<div className="flex flex-row items-baseline">
										<h2 className="text-9xl font-inter">{temperature}°C</h2>
									</div>
									<div className="flex flex-col items-center justify-center">
										{getWeatherIcon(description)}
										<div className="text-4xl mt-4 font-blockkie">
											<div className="flex flex-row items-center">
												{tempUp} {highTemp}°C
												{tempDown} {lowTemp}°C
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="flex-none p-4 flex flex-col">
								<div
									className="w-full flex flex-col mb-4"
									style={{ gap: "16px" }}
								>
									{/* First row - first 3 items */}
									<div className="w-full flex flex-row" style={{ gap: "16px" }}>
										{weatherStats.slice(0, 3).map((stat, index) => (
											<div
												key={index}
												className="p-2 rounded-xl border border-black flex-1 flex flex-row items-center"
											>
												<div className="p-2">{stat.icon}</div>
												<div className="flex flex-col">
													<div className="text-[28px] leading-none m-0">
														{stat.label}
													</div>
													<div className="text-[28px] leading-none m-0 font-bold">
														{stat.value}
													</div>
												</div>
											</div>
										))}
									</div>
									{/* Second row - remaining 3 items */}
									{weatherStats.length > 3 && (
										<div
											className="w-full flex flex-row"
											style={{ gap: "16px" }}
										>
											{weatherStats.slice(3).map((stat, index) => (
												<div
													key={index + 4}
													className="p-2 rounded-xl border border-black flex-1 flex flex-row items-center"
												>
													<div className="p-2">{stat.icon}</div>
													<div className="flex flex-col">
														<div className="text-[28px] leading-none m-0">
															{stat.label}
														</div>
														<div className="text-[28px] leading-none m-0 font-bold">
															{stat.value}
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
								<div
									className="w-full flex justify-between text-2xl p-2 rounded-xl dither-100"
									style={{ WebkitTextStroke: "4px white" }}
								>
									<div>{location}</div>
									<div>
										{lastUpdated && <span>Last updated: {lastUpdated}</span>}
									</div>
								</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
