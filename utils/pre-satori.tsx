import { cn } from "@/lib/utils";
import React from "react";

interface PreSatoriProps {
	useDoubling?: boolean;
	children: (
		transform: (child: React.ReactNode) => React.ReactNode,
		props: Record<
			string,
			React.CSSProperties | string | undefined | React.ReactNode
		>,
	) => React.ReactNode;
}

// Dither pattern mapping
const ditherPatterns: Record<
	string,
	{
		backgroundImage?: string;
		background?: string;
		backgroundSize?: string;
		backgroundColor?: string;
		backgroundRepeat?: string;
		imageRendering?: "auto" | "pixelated" | "crisp-edges";
		color?: string;
	}
> = {
	"dither-0": { background: "white" },
	"dither-15": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAB1JREFUKFNj/P///38GPIBxsCpgZGRkgLmdckcCAA+VIumpUMkGAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-25": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACVJREFUKFNj/P///38GPIARpICRkZEBlzqwAoImUF8BspsodwMApr8l6f1RibAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
	},
	"dither-50": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACRJREFUKFNj/P///38GPIARpICRkZEBWR0yH6yAoAmUK6CtGwAZEyvpL4ld4AAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
	},
	"dither-100": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACxJREFUKFNj/P///38GPICRgYEBRQ0jIyNIAK6FkaAJMAUYOqEmETaB9m4AABNDMekwLxh9AAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-150": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADJJREFUKFNj/P///38GPICRgYEBRQ0jIyNIgAFOEzQBpgCmA2Yb8SbA3IBuN9wkit0AAG2IN+kEJ1tPAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-250": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAB9JREFUKFNj/P///38GPICRgYEBrIaRkRHEwKSHhQkAfhtD6Ucw9IAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
	},
	"dither-300": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACpJREFUKFNj/P///38GPICRgYEBrIaRkRHEwKRBsjBJmEHIfOJMGGA3AADWlk/pFjm3rAAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
	},
	"dither-400": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC9JREFUKFNj/P///39GRkaG////M8AAMp+RgQEk958BJohBg2WhAJtJxJkwwG4AAJ1sVe/92Y1jAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
	},
	"dither-450": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC1JREFUKFNj/P///39GRkaG////M8AAMp+RgQEk958BJohBI5uATRFpJgyQGwD152Hv3xKg5QAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
	},
	"dither-500": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACNJREFUKFNjZGBg+P///38GRkZGEAOTBsnilGRkZGAcFiYAADCuZ/UGINVQAAAAAElFTkSuQmCC)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-550": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC1JREFUKFNjZGBg+P///38GRkZGBhhA5jOCZEGSMEF0GqQNbgJWRSSZMEBuAAD0L1v7ZeLPqQAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-600": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADBJREFUKFNjZGBg+P///38GRkZGBhhA5jOCZEGSMEF0GqTtPzadIDGwYqJMGGA3AABsFE/7ZTZQPQAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-700": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC5JREFUKFNjZGBg+M+ABzD+////PyMjI8P///8ZsNGMIBNgkjCDkPnEmTDAbgAALhhEAQn0O+sAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-750": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACJJREFUKFPdzDERAAAIgEDoHxoLeAaQ5TcE4sgqlYpNXxwGpe44ASPfdroAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-850": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADdJREFUKFOljjEKADAMAvX/j77S4Tp0CIVmCSF62iRkmAK0PRIg+3bvz0xQoEPUO8EOd7ak/w4LB80mAaT38REAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-900": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAADBJREFUKFNjZGBg+M+ABzD+////PyMjI1zJ////GZD5IBn8JsAUoOuE8QmbQHs3AACVqSAB6oX+JwAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-950": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAChJREFUKFNjZGBg+M+ABzCCFPz//5+BkRHEhABkPlgBQRMoV0BbNwAAmZ0UAR0pHrAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-975": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAChJREFUKFNjZGBg+M+ABzCCFPz//5+BkRHExARgBQRNoL4CZDdR7gYAD4gOAY4oCDAAAAAASUVORK5CYII=)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-985": {
		backgroundImage:
			"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAACFJREFUKFNjZGBg+M+ABzAOVgX///9nYGQEOY+BgXJHAgBsZwsBMq9u9gAAAABJRU5ErkJggg==)",
		backgroundSize: "8px 8px",
		color: "white",
	},
	"dither-1000": { background: "black", color: "white" },
	dither: {
		backgroundRepeat: "repeat",
		imageRendering: "pixelated",
	},
};

// List of Tailwind utilities that are known to cause issues with Satori
const unsupportedSatoriUtilities = [
	"antialiased",
	"outline-none",
	"inherit",
	"appearance-none",
	"select-none",
	"align-baseline",
	"list-none",
	"truncate",
	"subpixel-antialiased",
	"font-blockkie", // Handle these specially
	"font-geneva9", // Handle these specially
	"text-inherit",
	"font-inherit",
	"no-underline",
];

// Satori-compatible reset styles for HTML elements
// These override Satori's default styles
const satoriResetStyles: Record<string, string> = {
	common: "m-0 p-0 border-0 bg-transparent shadow-none",
	heading: "m-0 p-0 border-0 bg-transparent shadow-none",
	paragraph: "m-0 p-0 border-0 bg-transparent shadow-none",
	div: "m-0 p-0 border-0 bg-transparent shadow-none",
};

/*
	This function helps Satori figure out the font size of the text.
*/
const calculateFontSize = (
	parentFontSize: number,
	className?: string,
): number => {
	if (!className) return parentFontSize;

	// Define Tailwind text size mappings
	const tailwindTextSizes: Record<string, number> = {
		"text-xs": 12, // 0.75rem
		"text-sm": 14, // 0.875rem
		"text-base": 16, // 1rem
		"text-lg": 18, // 1.125rem
		"text-xl": 20, // 1.25rem
		"text-2xl": 24, // 1.5rem
		"text-3xl": 30, // 1.875rem
		"text-4xl": 36, // 2.25rem
		"text-5xl": 48, // 3rem
		"text-6xl": 60, // 3.75rem
		"text-7xl": 72, // 4.5rem
		"text-8xl": 96, // 6rem
		"text-9xl": 128, // 8rem
	};

	// Split the className into individual classes
	const classes = className.split(" ");

	// First check for standard Tailwind text size classes
	for (const cls of classes) {
		if (tailwindTextSizes[cls]) {
			return tailwindTextSizes[cls];
		}
	}

	// Then check for custom pixel-based size
	const fontSizeClass = classes.find(
		(cls) => cls.startsWith("text-[") && cls.endsWith("px]"),
	);

	if (fontSizeClass) {
		// Extract the numeric value from the class, e.g., text-[24px]
		const match = fontSizeClass.match(/text-\[(\d+)px\]/);
		if (match?.[1]) {
			return Number.parseInt(match[1], 10);
		}
	}

	// Return the parent font size if no specific font size class is found
	return parentFontSize;
};

// Filter out Tailwind classes that are known to cause issues with Satori
const filterOutUnsupportedClasses = (className?: string): string => {
	if (!className) return "";

	const classes = className.split(" ");
	const filteredClasses = classes.filter((cls) => {
		// Keep the class if it's not in the unsupported list
		return !unsupportedSatoriUtilities.includes(cls);
	});

	return filteredClasses.join(" ");
};

// Convert relative line height to absolute pixels
const convertRelativeLineHeight = (
	fontSize: number,
	className?: string,
): React.CSSProperties | undefined => {
	if (!className) return undefined;

	// Extract all leading-* classes
	const classes = className.split(" ");
	const lineHeightClasses = classes.filter((cls) => cls.startsWith("leading-"));

	if (lineHeightClasses.length === 0) return undefined;

	// Check for any explicit pixel value class - if one exists, extract the value
	const explicitLeadingClass = lineHeightClasses.find((cls) =>
		cls.startsWith("leading-["),
	);
	if (explicitLeadingClass) {
		// Extract pixel value if possible
		const match = explicitLeadingClass.match(/leading-\[(\d+)px\]/);
		if (match?.[1]) {
			return { lineHeight: `${match[1]}px` };
		}
		return undefined;
	}

	// Map common Tailwind line height values to their numeric equivalents
	const lineHeightMap: Record<string, number> = {
		"leading-none": 1,
		"leading-tight": 1.25,
		"leading-snug": 1.375,
		"leading-normal": 1.5,
		"leading-relaxed": 1.625,
		"leading-loose": 2,
	};

	// Find the first matching class that has a mapping
	for (const cls of lineHeightClasses) {
		const lineHeight = lineHeightMap[cls];
		if (lineHeight) {
			const pixelValue = Math.round(fontSize * lineHeight);
			return { lineHeight: `${pixelValue}px` };
		}
	}

	return undefined;
};

// Convert relative letter spacing to absolute pixels
const convertRelativeTracking = (
	fontSize: number,
	className?: string,
): React.CSSProperties | undefined => {
	if (!className) return undefined;

	// Extract all tracking-* classes
	const classes = className.split(" ");
	const trackingClasses = classes.filter((cls) => cls.startsWith("tracking-"));

	if (trackingClasses.length === 0) return undefined;

	// Check for any explicit pixel value class - if one exists, extract the value
	const explicitTrackingClass = trackingClasses.find((cls) =>
		cls.startsWith("tracking-["),
	);
	if (explicitTrackingClass) {
		// Extract pixel value if possible
		const match = explicitTrackingClass.match(/tracking-\[(.+?)px\]/);
		if (match?.[1]) {
			return { letterSpacing: `${match[1]}px` };
		}
		return undefined;
	}

	// Map common Tailwind tracking values to their em equivalents
	const trackingMap: Record<string, number> = {
		"tracking-tighter": -0.05,
		"tracking-tight": -0.025,
		"tracking-normal": 0,
		"tracking-wide": 0.025,
		"tracking-wider": 0.05,
		"tracking-widest": 0.1,
	};

	// Find the first matching class that has a mapping
	for (const cls of trackingClasses) {
		const tracking = trackingMap[cls];
		if (tracking !== undefined) {
			// Convert em to pixels based on font size
			const pixelValue = tracking * fontSize;
			return { letterSpacing: `${pixelValue}px` };
		}
	}

	return undefined;
};

// Add new helper function to extract font family
const extractFontFamily = (className?: string): string | undefined => {
	if (!className) return undefined;

	// Look for font-* classes
	const fontClass = className.split(" ").find((cls) => cls.startsWith("font-"));

	if (fontClass) {
		switch (fontClass) {
			case "font-blockkie":
				return "BlockKie"; // Return the actual font name
			case "font-geneva9":
				return "Geneva9"; // Return the actual font name
			case "font-inter":
				return "Inter"; // Return the actual font name
			case "font-sans":
				return "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif";
			case "font-serif":
				return "ui-serif, Georgia, Cambria, Times New Roman, Times, serif";
			case "font-mono":
				return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace";
			default:
				// Handle any custom font-[...] classes
				const customFontMatch = fontClass.match(/font-\[(.*?)\]/);
				if (customFontMatch && customFontMatch[1]) {
					return customFontMatch[1].replace(/['"]/g, ""); // Remove quotes if present
				}
				return undefined;
		}
	}
	return undefined;
};

export const PreSatori: React.FC<PreSatoriProps> = ({
	useDoubling = false,
	children,
	...props
}) => {
	// Define a helper to recursively transform children.
	const transform = (
		child: React.ReactNode,
		parentFontSize = 16,
	): React.ReactNode => {
		if (React.isValidElement(child)) {
			const newProps: {
				className?: string;
				style?: React.CSSProperties;
				children?: React.ReactNode;
				tw?: string;
			} = {};
			const { className, style, children, ...restProps } = child.props as {
				className?: string;
				style?: React.CSSProperties;
				children?: React.ReactNode;
				[key: string]:
					| React.CSSProperties
					| string
					| undefined
					| React.ReactNode;
			};

			// Calculate the font size
			const fontSize = calculateFontSize(parentFontSize, className);

			// Extract font family
			const fontFamily = extractFontFamily(className);

			// Handle style props for Satori rendering
			const newStyle: React.CSSProperties = {
				...style,
				fontSize: `${fontSize}px`,
				...(fontFamily ? { fontFamily } : {}),
				fontSmooth: "always",
			};

			// Special handling for display properties
			// For Satori, DIVs MUST have display: flex
			if (child.type === "div") {
				// Check if user explicitly set display property in style
				if (style?.display) {
					// User-defined style takes priority, but ensure it's compatible with Satori
					if (style.display === "none") {
						newStyle.display = "none";
					} else {
						// For all other values, enforce flex for Satori
						newStyle.display = "flex";
					}
				} else {
					// Default for divs
					newStyle.display = "flex";
				}
			}

			// Process className for dither patterns and regular styling
			if (className) {
				const remainingClassNames: string[] = [];
				// Extract dither classes
				const classes = className.split(" ");

				// Check for dither classes and apply their styles
				for (const cls of classes) {
					if (cls.startsWith("dither-")) {
						Object.assign(newStyle, ditherPatterns[cls], ditherPatterns.dither);
					} else {
						// Keep all other classes for browser rendering
						remainingClassNames.push(cls);
					}
				}

				// For browser rendering, preserve ALL original classes
				// This is SAFE because it goes into React, not Tailwind CSS compiler
				newProps.className = cn(remainingClassNames.join(" "));

				// Handle line height and tracking
				// Apply these as style properties for Satori
				const lineHeightStyle = convertRelativeLineHeight(fontSize, className);
				if (lineHeightStyle) {
					Object.assign(newStyle, lineHeightStyle);
				}

				const trackingStyle = convertRelativeTracking(fontSize, className);
				if (trackingStyle) {
					Object.assign(newStyle, trackingStyle);
				}

				// For Satori rendering via the tw prop
				// 1. Filter out unsupported classes
				// 2. Add reset styles
				if (typeof child.type === "string") {
					// Get appropriate reset styles
					let resetStyles = "";

					// Apply element-specific resets
					if (child.type.startsWith("h")) {
						resetStyles = satoriResetStyles.heading;
					} else if (child.type === "p") {
						resetStyles = satoriResetStyles.paragraph;
					} else if (child.type === "div") {
						resetStyles = satoriResetStyles.div;
					} else {
						resetStyles = satoriResetStyles.common;
					}

					// Filter classes for Satori rendering
					const satoriClasses = filterOutUnsupportedClasses(
						remainingClassNames.join(" "),
					);

					// Set the tw prop for Satori with static classes only
					newProps.tw = cn(resetStyles, satoriClasses);
				}
			}

			// Apply the combined styles
			if (Object.keys(newStyle).length > 0) {
				newProps.style = newStyle;
			}

			// If the element has children, transform them recursively.
			if (children) {
				newProps.children = React.Children.map(children, (child) =>
					transform(child, fontSize),
				);
			}

			return React.cloneElement(child, { ...restProps, ...newProps });
		}
		return child;
	};

	// The render prop provides the transformation helper to the parent.
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				fontFamily: "BlockKie",
				color: "black",
				backgroundColor: "#ffffff",
				fontSize: "16px",
				transformOrigin: "top left",
				...(useDoubling ? { transform: "scale(2)" } : {}),
			}}
		>
			{children(transform, props)}
		</div>
	);
};
