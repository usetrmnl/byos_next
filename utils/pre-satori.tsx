import React from "react";
import { extractFontFamily } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
	getResetStyles,
	processDither,
	processGap,
	processResponsive,
} from "./pre-satori-tailwind";

interface PreSatoriProps {
	useDoubling?: boolean;
	width?: number;
	height?: number;
	children: React.ReactNode;
}
export const getRendererType = (): "takumi" | "satori" => {
	const renderer = process.env.REACT_RENDERER?.toLowerCase();
	return renderer === "satori" ? "satori" : "takumi";
};

export const PreSatori: React.FC<PreSatoriProps> = ({
	useDoubling = false,
	width = 800,
	height = 480,
	children,
}) => {
	// Define a helper to recursively transform children.
	const transform = (child: React.ReactNode): React.ReactNode => {
		if (React.isValidElement(child)) {
			const {
				className,
				style,
				children: childChildren,
				...restProps
			} = child.props as {
				className?: string;
				style?: React.CSSProperties;
				children?: React.ReactNode;
				[key: string]: unknown;
			};
			const fontFamily = extractFontFamily(className);
			const newStyle: React.CSSProperties = {
				...style,
				fontSmooth: "always",
				...(fontFamily ? { fontFamily } : {}),
			};

			// Special handling for display properties
			if (getRendererType() === "satori") {
				if (
					style?.display !== "flex" &&
					style?.display !== "contents" &&
					style?.display !== "none"
				) {
					newStyle.display = "flex";
				}
			}

			// Process className for dither patterns, gap classes, and responsive breakpoints
			const responsiveClass = processResponsive(className, width);
			// Check if element should be hidden - don't render it at all
			if (
				responsiveClass.includes("hidden") &&
				getRendererType() === "satori"
			) {
				return null;
			}
			let afterGapClass = responsiveClass;
			let gapStyle = {};
			if (getRendererType() === "satori") {
				({ style: gapStyle, className: afterGapClass } =
					processGap(responsiveClass));
			}
			const { style: ditherStyle, className: finalClass } =
				processDither(afterGapClass);

			Object.assign(newStyle, gapStyle, ditherStyle);

			// Determine reset styles
			const resetStyles = getResetStyles(child);

			// Construct new props
			const newProps: Record<string, unknown> = {
				...restProps,
				style: newStyle,
				className: cn(resetStyles, finalClass), // Keep for browser/React
				// Pass Tailwind classes to 'tw' prop for Takumi/Satori rendering
				// We combine reset styles with user classes
				tw: cn(resetStyles, finalClass),
			};

			// Recursively transform children
			if (childChildren) {
				newProps.children = React.Children.map(childChildren, (c) =>
					transform(c),
				);
			}

			return React.cloneElement(child, newProps);
		}
		return child;
	};

	return (
		<div
			style={{
				display: "flex",
				width: `${width}px`,
				height: `${height}px`,
				transformOrigin: "top left",
				...(useDoubling ? { transform: "scale(2)" } : {}),
			}}
		>
			{React.Children.map(children, (child) => transform(child))}
			{/* {children} */}
		</div>
	);
};
