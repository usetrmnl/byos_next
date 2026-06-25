import type { CSSProperties, ReactNode } from "react";
import {
	BitmapMarker,
	type BitmapMarkerFont,
	bitmapSizeFromTarget,
} from "@/components/bitmap-font/bitmap-marker";
import type { ScreenProfile } from "@/lib/trmnl/screen-profile";
import { cn } from "@/lib/utils";

export type ScreenStat = {
	label: string;
	value: ReactNode;
	icon?: ReactNode;
};

export const SCREEN_FOOTER_BACKGROUND = "#6b7280";
export const SCREEN_FOREGROUND = "#000";
export const SCREEN_BACKGROUND = "#fff";

export const MIN_SCREEN_FONT_SIZE = 14;
export const MIN_SCREEN_BODY_FONT_SIZE = 16;
export const MIN_SCREEN_STAT_LABEL_FONT_SIZE = 18;

function screenScale(screen: ScreenProfile): number {
	return Math.max(
		0.75,
		Math.min(screen.logicalWidth / 800, screen.logicalHeight / 480),
	);
}

export function screenMetric(screen: ScreenProfile, value: number): number {
	return Math.max(1, Math.round(value * screenScale(screen) * screen.uiScale));
}

export function screenFontSize(
	screen: ScreenProfile,
	value: number,
	minimum = MIN_SCREEN_FONT_SIZE,
): number {
	return Math.max(minimum, screenMetric(screen, value));
}

export function ScreenCanvas({
	screen,
	children,
	className,
	style,
}: {
	screen: ScreenProfile;
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}) {
	const padding = screen.isCompact
		? screenMetric(screen, 12)
		: screenMetric(screen, screen.isLarge ? 28 : 18);
	const gap = screen.isCompact
		? screenMetric(screen, 8)
		: screenMetric(screen, screen.isLarge ? 16 : 10);

	return (
		<div
			className={cn(
				"flex h-full w-full flex-col overflow-hidden bg-white text-black",
				className,
			)}
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				backgroundColor: SCREEN_BACKGROUND,
				color: SCREEN_FOREGROUND,
				padding,
				gap,
				...style,
			}}
		>
			{children}
		</div>
	);
}

export function ScreenFooter({
	screen,
	left,
	right,
	bitmap = false,
	className,
	style,
}: {
	screen: ScreenProfile;
	left: ReactNode;
	right?: ReactNode;
	bitmap?: boolean;
	className?: string;
	style?: CSSProperties;
}) {
	const footerFontSize = screenFontSize(
		screen,
		screen.isCompact ? 16 : 20,
		MIN_SCREEN_BODY_FONT_SIZE,
	);
	const footerPad = screenMetric(screen, 7);
	const explicitHeight =
		typeof style?.height === "number" ? style.height : undefined;
	const footerInnerHeight = explicitHeight
		? explicitHeight - footerPad * 2
		: screenMetric(screen, screen.isCompact ? 20 : 28);
	const footerBitmapSize = Math.max(
		10,
		Math.min(
			bitmapSizeFromTarget(footerFontSize, 0.55),
			Math.floor(footerInnerHeight * 0.45),
			screenFontSize(screen, screen.isCompact ? 10 : 11, 10),
		),
	);

	const renderFooterText = (content: ReactNode) => {
		if (bitmap && typeof content === "string") {
			return (
				<BitmapMarker
					text={content}
					sizePx={footerBitmapSize}
					className="text-white"
				/>
			);
		}

		return content;
	};

	return (
		<div
			className={cn(
				"flex flex-none flex-row items-center justify-between rounded-xl bg-gray-500 font-inter text-white",
				className,
			)}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				flex: "none",
				backgroundColor: SCREEN_FOOTER_BACKGROUND,
				borderRadius: screenMetric(screen, 10),
				color: "#fff",
				padding: bitmap
					? `${screenMetric(screen, 4)}px ${screenMetric(screen, 10)}px`
					: `${screenMetric(screen, 7)}px ${screenMetric(screen, 12)}px`,
				fontSize: footerFontSize,
				fontFamily: bitmap ? undefined : "Inter, sans-serif",
				lineHeight: 1,
				gap: screenMetric(screen, 10),
				...style,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					overflow: "hidden",
					whiteSpace: "nowrap",
					minWidth: 0,
					flex: right ? "1 1 52%" : undefined,
					maxWidth: right ? "52%" : undefined,
				}}
			>
				{renderFooterText(left)}
			</div>
			{right ? (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						overflow: "hidden",
						whiteSpace: "nowrap",
						textAlign: "right",
						minWidth: 0,
						flex: "0 1 46%",
						maxWidth: "46%",
						marginLeft: screenMetric(screen, 8),
					}}
				>
					{renderFooterText(right)}
				</div>
			) : null}
		</div>
	);
}

export function MetricHero({
	screen,
	title,
	subtitle,
	aside,
}: {
	screen: ScreenProfile;
	title: ReactNode;
	subtitle?: ReactNode;
	aside?: ReactNode;
}) {
	const titleSize = screenMetric(
		screen,
		screen.isHalfScreen ? 44 : screen.isLarge ? 76 : 64,
	);
	const subtitleSize = screenFontSize(
		screen,
		screen.isHalfScreen ? 20 : screen.isLarge ? 32 : 26,
		MIN_SCREEN_BODY_FONT_SIZE,
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "flex-start",
				justifyContent: "space-between",
				flex: "none",
				gap: screenMetric(screen, 10),
			}}
		>
			<div
				style={{
					display: "flex",
					minWidth: 0,
					flex: 1,
					flexDirection: "column",
				}}
			>
				<div
					className="font-inter tracking-tight"
					style={{
						fontFamily: "Inter, sans-serif",
						fontSize: titleSize,
						letterSpacing: "-0.025em",
						lineHeight: 0.88,
					}}
				>
					{title}
				</div>
				{subtitle ? (
					<div
						className="mt-1 font-inter"
						style={{
							fontFamily: "Inter, sans-serif",
							fontSize: subtitleSize,
							lineHeight: 1,
							marginTop: screenMetric(screen, 4),
						}}
					>
						{subtitle}
					</div>
				) : null}
			</div>
			{aside ? (
				<div style={{ display: "flex", flex: "none" }}>{aside}</div>
			) : null}
		</div>
	);
}

export function StatsGrid({
	screen,
	stats,
	columns,
	fill = false,
	bitmap = false,
	bitmapLabelFont = "ft",
	bitmapTextGap,
	bitmapIconGap,
	gapSize,
	rowHeight,
	labelSize,
	valueSize,
}: {
	screen: ScreenProfile;
	stats: ScreenStat[];
	columns?: number;
	fill?: boolean;
	bitmap?: boolean;
	bitmapLabelFont?: BitmapMarkerFont;
	bitmapTextGap?: number;
	bitmapIconGap?: number;
	gapSize?: number;
	rowHeight?: number;
	labelSize?: number;
	valueSize?: number;
}) {
	const resolvedColumns =
		columns ??
		(screen.isHalfScreen || screen.orientation === "portrait" ? 2 : 4);
	const rows: ScreenStat[][] = [];
	for (let index = 0; index < stats.length; index += resolvedColumns) {
		rows.push(stats.slice(index, index + resolvedColumns));
	}
	const gap = gapSize ?? screenMetric(screen, screen.isCompact ? 6 : 8);
	const borderWidth = screen.isLarge ? 2 : 1;
	const resolvedLabelSize =
		labelSize ??
		screenFontSize(
			screen,
			screen.isCompact ? 16 : 17,
			MIN_SCREEN_STAT_LABEL_FONT_SIZE,
		);
	const resolvedValueSize =
		valueSize ??
		screenFontSize(
			screen,
			screen.isCompact ? 18 : 24,
			MIN_SCREEN_BODY_FONT_SIZE,
		);
	const bitmapLabelSize =
		bitmapLabelFont === "geneva12"
			? bitmapSizeFromTarget(resolvedLabelSize, 0.9, 14)
			: bitmapSizeFromTarget(resolvedLabelSize, 0.58, 10);
	const bitmapValueSize = bitmapSizeFromTarget(resolvedValueSize, 0.58, 10);
	const statTextGap = bitmapTextGap ?? (bitmap ? screenMetric(screen, 2) : 0);
	const statIconGap =
		bitmapIconGap ??
		(bitmap ? screenMetric(screen, 5) : screenMetric(screen, 8));
	const statCellPad = bitmap
		? screenMetric(
				screen,
				bitmapLabelFont === "geneva12"
					? screen.isCompact
						? 6
						: 8
					: screen.isCompact
						? 4
						: 6,
			)
		: screenMetric(screen, screen.isCompact ? 6 : 9);
	const statRowMinHeight = rowHeight
		? undefined
		: screenMetric(
				screen,
				bitmap
					? bitmapLabelFont === "geneva12"
						? screen.isCompact
							? 52
							: 56
						: screen.isCompact
							? 44
							: 48
					: screen.isCompact
						? 48
						: 64,
			);

	return (
		<div
			style={{
				display: "flex",
				flex: fill && !bitmap ? 1 : "none",
				flexDirection: "column",
				gap,
			}}
		>
			{rows.map((row, rowIndex) => (
				<div
					key={`row-${rowIndex}`}
					className="flex flex-row"
					style={{
						display: "flex",
						flexDirection: "row",
						gap,
						height: rowHeight,
						minHeight: statRowMinHeight,
						flex: fill && !rowHeight && !bitmap ? 1 : undefined,
					}}
				>
					{row.map((stat) => (
						<div
							key={stat.label}
							className="flex flex-1 flex-col justify-center overflow-hidden border border-black"
							style={{
								display: "flex",
								flex: 1,
								flexDirection: "column",
								justifyContent: bitmap ? "flex-start" : "center",
								overflow: "hidden",
								borderColor: SCREEN_FOREGROUND,
								borderStyle: "solid",
								borderWidth,
								borderRadius: screenMetric(screen, 10),
								padding: statCellPad,
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: stat.icon ? "row" : "column",
									alignItems: stat.icon ? "center" : "flex-start",
									gap: stat.icon ? statIconGap : 0,
									minWidth: 0,
								}}
							>
								{stat.icon ? (
									<div style={{ display: "flex", flex: "none" }}>
										{stat.icon}
									</div>
								) : null}
								<div
									style={{
										display: "flex",
										minWidth: 0,
										flex: 1,
										flexDirection: "column",
										gap: statTextGap,
									}}
								>
									{bitmap ? (
										<div
											style={{
												display: "flex",
												overflow: "hidden",
												flex: "none",
											}}
										>
											<BitmapMarker
												text={stat.label}
												sizePx={bitmapLabelSize}
												font={bitmapLabelFont}
											/>
										</div>
									) : (
										<div
											className="whitespace-nowrap font-inter"
											style={{
												fontFamily: "Inter, sans-serif",
												fontSize: resolvedLabelSize,
												fontWeight: 500,
												lineHeight: 1.05,
												overflow: "hidden",
												whiteSpace: "nowrap",
											}}
										>
											{stat.label}
										</div>
									)}
									{bitmap && typeof stat.value === "string" ? (
										<div
											style={{
												display: "flex",
												overflow: "hidden",
												flex: "none",
											}}
										>
											<BitmapMarker
												text={stat.value}
												sizePx={bitmapValueSize}
											/>
										</div>
									) : (
										<div
											className="whitespace-nowrap font-inter"
											style={{
												fontFamily: "Inter, sans-serif",
												fontSize: resolvedValueSize,
												lineHeight: 1.05,
												overflow: "hidden",
												whiteSpace: "nowrap",
											}}
										>
											{stat.value}
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
