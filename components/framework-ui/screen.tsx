import React from "react";
import clsx from "clsx";

type DeviceVariant = "og" | "og_png" | "ogv2";

interface ScreenProps {
	device?: DeviceVariant;
	portrait?: boolean;
	noBleed?: boolean;
	darkMode?: boolean;
	backdrop?: boolean;
	bitDepth?: 1 | 2 | 4;
	className?: string;
	children?: React.ReactNode;
}

export default function Screen({
	device,
	portrait,
	noBleed,
	darkMode,
	backdrop,
	bitDepth,
	className,
	children,
}: ScreenProps) {
	return (
		<div
			className={clsx(
				"screen",
				device && `screen--${device}`,
				portrait && "screen--portrait",
				noBleed && "screen--no-bleed",
				darkMode && "screen--dark-mode",
				backdrop && "screen--backdrop",
				bitDepth && `screen--${bitDepth}bit`,
				className,
			)}
		>
			{children}
		</div>
	);
}
