import React from "react";
import { cn } from "@/lib/utils";
import { extractFontFamily } from "@/lib/fonts";
import {
	processResponsive,
	processGap,
	processDither,
	getResetStyles,
} from "./pre-satori-tailwind";

interface PreSatoriProps {
	useDoubling?: boolean;
	width?: number;
	height?: number;
	children: React.ReactNode;
}

export const PreSatori: React.FC<PreSatoriProps> = ({
	useDoubling = false,
	width = 800,
	height = 480,
	children,
}) => {
	// Define a helper to recursively transform children.
	const transform = (child: React.ReactNode): React.ReactNode => {
		if (React.isValidElement(child)) {
			const { className, style, children: childChildren, ...restProps } = child.props as {
				className?: string;
				style?: React.CSSProperties;
				children?: React.ReactNode;
				[key: string]: any;
			};
			const fontFamily = extractFontFamily(className);
			const newStyle: React.CSSProperties = {
				...style,
				fontSmooth: "always",
				...(fontFamily ? { fontFamily } : {}),
			};

			// Special handling for display properties
			if (child.type === "div") {
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
			if (responsiveClass.includes("hidden")) {
				return null;
			}
			const { style: gapStyle, className: afterGapClass } = processGap(
				responsiveClass,
			);
			const { style: ditherStyle, className: finalClass } = processDither(
				afterGapClass,
			);

			Object.assign(newStyle, gapStyle, ditherStyle);

			// Determine reset styles
			const resetStyles = getResetStyles(child);

			// Construct new props
			const newProps: any = {
				...restProps,
				style: newStyle,
				className: finalClass, // Keep for browser/React
				// Pass Tailwind classes to 'tw' prop for Satori/ImageResponse
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
				flexDirection: "column",
				width: `${width}px`,
				height: `${height}px`,
				color: "black",
				backgroundColor: "#ffffff",
				fontSize: "16px",
				transformOrigin: "top left",
				...(useDoubling ? { transform: "scale(2)" } : {}),
			}}
		>
			{React.Children.map(children, (child) => transform(child))}
		</div>
	);
};
