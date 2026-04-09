import React from "react";
import clsx from "clsx";

type ViewVariant = "full" | "half_horizontal" | "half_vertical" | "quadrant";

interface ViewProps {
	variant?: ViewVariant;
	className?: string;
	children?: React.ReactNode;
}

export default function View({
	variant = "full",
	className,
	children,
}: ViewProps) {
	return (
		<div className={clsx("view", `view--${variant}`, className)}>
			{children}
		</div>
	);
}
