import React from "react";
import clsx from "clsx";

type LayoutDirection = "row" | "col";

type LayoutHAlign = "left" | "center-x" | "right";

type LayoutVAlign = "top" | "center-y" | "bottom";

type LayoutStretch = "stretch" | "stretch-x" | "stretch-y";

interface LayoutProps {
	direction?: LayoutDirection;
	hAlign?: LayoutHAlign;
	vAlign?: LayoutVAlign;
	center?: boolean;
	stretch?: LayoutStretch;
	className?: string;
	children?: React.ReactNode;
}

export default function Layout({
	direction,
	hAlign,
	vAlign,
	center,
	stretch,
	className,
	children,
}: LayoutProps) {
	return (
		<div
			className={clsx(
				"layout",
				direction && `layout--${direction}`,
				hAlign && `layout--${hAlign}`,
				vAlign && `layout--${vAlign}`,
				center && "layout--center",
				stretch && `layout--${stretch}`,
				className,
			)}
		>
			{children}
		</div>
	);
}
