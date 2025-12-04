import React from "react";
import { cn } from "@/lib/utils";
import { ditherPatterns } from "./dither-patterns";
import { extractFontFamily } from "@/lib/fonts";

interface PreSatoriProps {
	useDoubling?: boolean;
	children: React.ReactNode;
}

// Satori-compatible reset styles for HTML elements
const satoriResetStyles: Record<string, string> = {
	common: "m-0 p-0 border-0 bg-transparent shadow-none",
	heading: "m-0 p-0 border-0 bg-transparent shadow-none",
	paragraph: "m-0 p-0 border-0 bg-transparent shadow-none",
	div: "m-0 p-0 border-0 bg-transparent shadow-none",
};

export const PreSatori: React.FC<PreSatoriProps> = ({
	useDoubling = false,
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

			const remainingClassNames: string[] = [];

			// Process className for dither patterns
			if (className) {
				const classes = className.split(" ");
				for (const cls of classes) {
					if (cls.startsWith("dither-")) {
						Object.assign(newStyle, ditherPatterns[cls], ditherPatterns.dither);
					} else {
						remainingClassNames.push(cls);
					}
				}
			}

			const cleanClassName = remainingClassNames.join(" ");

			// Determine reset styles
			let resetStyles = "";
			if (typeof child.type === "string") {
				if (child.type.startsWith("h")) {
					resetStyles = satoriResetStyles.heading;
				} else if (child.type === "p") {
					resetStyles = satoriResetStyles.paragraph;
				} else if (child.type === "div") {
					resetStyles = satoriResetStyles.div;
				} else {
					resetStyles = satoriResetStyles.common;
				}
			}

			// Construct new props
			const newProps: any = {
				...restProps,
				style: newStyle,
				className: cleanClassName, // Keep for browser/React
				// Pass Tailwind classes to 'tw' prop for Satori/ImageResponse
				// We combine reset styles with user classes
				tw: cn(resetStyles, cleanClassName),
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
				width: "100%",
				height: "100%",
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
