"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Columns2, Rows2, ZoomIn, ZoomOut } from "lucide-react";
import {
	SlideToggle,
	type SlideToggleOption,
} from "@/components/ui/slide-toggle";

type RecipePreviewLayoutProps = {
	children?: React.ReactNode;
	bmpComponent?: React.ReactNode;
	pngComponent?: React.ReactNode;
	svgComponent?: React.ReactNode;
	reactComponent?: React.ReactNode;
	bmpLinkComponent?: React.ReactNode;
	pngLinkComponent?: React.ReactNode;
	svgLinkComponent?: React.ReactNode;
	reactLinkComponent?: React.ReactNode;
	defaultLayout?: "columns" | "rows";
	defaultScale?: "full" | "half";
	defaultRenderType?: "bmp" | "png" | "svg";
};

const RecipePreviewLayout = ({
	children,
	bmpComponent,
	pngComponent,
	svgComponent,
	reactComponent,
	bmpLinkComponent,
	pngLinkComponent,
	svgLinkComponent,
	reactLinkComponent,
	defaultLayout = "rows",
	defaultScale = "full",
	defaultRenderType = "bmp",
}: RecipePreviewLayoutProps) => {
	const [layout, setLayout] = React.useState<"columns" | "rows">(defaultLayout);
	const [scale, setScale] = React.useState<"full" | "half">(defaultScale);
	const [renderType, setRenderType] = React.useState<"bmp" | "png" | "svg">(
		defaultRenderType,
	);
	const [isInitialized, setIsInitialized] = React.useState(false);

	// Constants for width calculations
	const singleColumnWidth = 800 + 2; // adding 2px for the border
	const spacing = 16; // This is equivalent to gap-4 in Tailwind (4 * 4px)

	// Toggle options
	const layoutOptions: SlideToggleOption<"columns" | "rows">[] = [
		{
			value: "columns",
			icon: <Columns2 className="h-4 w-4" />,
			label: "Columns",
			ariaLabel: "Column layout",
		},
		{
			value: "rows",
			icon: <Rows2 className="h-4 w-4" />,
			label: "Rows",
			ariaLabel: "Row layout",
		},
	];

	const scaleOptions: SlideToggleOption<"full" | "half">[] = [
		{
			value: "full",
			icon: <ZoomIn className="h-4 w-4" />,
			label: "Full",
			ariaLabel: "Full scale (1x)",
		},
		{
			value: "half",
			icon: <ZoomOut className="h-4 w-4" />,
			label: "Half",
			ariaLabel: "Half scale (0.5x)",
		},
	];

	// Load saved preferences from localStorage on component mount
	React.useEffect(() => {
		// Use a non-blocking approach to read from localStorage
		const loadPreferences = () => {
			try {
				const savedLayout = localStorage.getItem("recipePreviewLayout") as
					| "columns"
					| "rows"
					| null;
				const savedScale = localStorage.getItem("recipePreviewScale") as
					| "full"
					| "half"
					| null;
				const savedRenderType = localStorage.getItem(
					"recipePreviewRenderType",
				) as "bmp" | "png" | "svg" | null;

				if (savedLayout) {
					setLayout(savedLayout);
				}

				if (savedScale) {
					setScale(savedScale);
				}

				if (savedRenderType) {
					setRenderType(savedRenderType);
				}

				setIsInitialized(true);
			} catch (error) {
				console.error("Error loading preferences from localStorage:", error);
				setIsInitialized(true);
			}
		};

		// Use requestIdleCallback for non-blocking operation if available
		if (typeof window !== "undefined") {
			if ("requestIdleCallback" in window) {
				(window as unknown as Window).requestIdleCallback(loadPreferences);
			} else {
				// Fallback to setTimeout for browsers that don't support requestIdleCallback
				setTimeout(loadPreferences, 0);
			}
		}
	}, []);

	// Handle layout change
	const handleLayoutChange = React.useCallback(
		(newLayout: "columns" | "rows") => {
			setLayout(newLayout);
			// Defer localStorage update to not block rendering
			setTimeout(() => {
				try {
					localStorage.setItem("recipePreviewLayout", newLayout);
				} catch (error) {
					console.error("Error saving layout preference:", error);
				}
			}, 0);
		},
		[],
	);

	// Handle scale change
	const handleScaleChange = React.useCallback((newScale: "full" | "half") => {
		setScale(newScale);
		// Defer localStorage update to not block rendering
		setTimeout(() => {
			try {
				localStorage.setItem("recipePreviewScale", newScale);
			} catch (error) {
				console.error("Error saving scale preference:", error);
			}
		}, 0);
	}, []);

	// Handle render type change
	const handleRenderTypeChange = React.useCallback(
		(newRenderType: "bmp" | "png" | "svg") => {
			setRenderType(newRenderType);
			// Defer localStorage update to not block rendering
			setTimeout(() => {
				try {
					localStorage.setItem("recipePreviewRenderType", newRenderType);
				} catch (error) {
					console.error("Error saving render type preference:", error);
				}
			}, 0);
		},
		[],
	);

	// Calculate width based on layout
	const getContainerWidth = React.useCallback(
		({ l, sCW, sP }: { l: "columns" | "rows"; sCW: number; sP: number }) => {
			if (l === "columns") {
				return `${sCW * 2 + sP * 3}px`;
			}
			return `${sCW}px`;
		},
		[],
	);

	// If not initialized yet, render a placeholder with the same dimensions
	// to prevent layout shifts when preferences load
	if (!isInitialized) {
		return (
			<div className="flex flex-col gap-4 items-start">
				<div className="flex gap-2">
					<div className="inline-flex items-center rounded-md border bg-muted p-1 h-10 w-24" />
					<div className="inline-flex items-center rounded-md border bg-muted p-1 h-10 w-24" />
					<div className="inline-flex items-center rounded-md border bg-muted p-1 h-10 w-24" />
				</div>
				<div className="w-full">
					<div
						className="grid gap-4 transition-all duration-200 grid-cols-2"
						style={{ width: `${singleColumnWidth * 2 + spacing * 3}px` }}
					>
						{children}
					</div>
				</div>
			</div>
		);
	}

	// Determine what to render based on provided components or children
	const renderContent = () => {
		// If specific components are provided, use them
		if (bmpComponent || pngComponent || svgComponent || reactComponent) {
			let imageComponent: React.ReactNode | undefined;
			let linkComponent: React.ReactNode | undefined;

			if (renderType === "bmp") {
				imageComponent = bmpComponent;
				linkComponent = bmpLinkComponent;
			} else if (renderType === "png") {
				imageComponent = pngComponent;
				linkComponent = pngLinkComponent;
			} else if (renderType === "svg") {
				imageComponent = svgComponent;
				linkComponent = svgLinkComponent;
			}

			// Create an array of components to render
			const componentsToRender = [];

			if (imageComponent) {
				componentsToRender.push(
					<div key="image" className="flex flex-col gap-0 mb-2">
						{imageComponent}
						{linkComponent && <div className="mt-1">{linkComponent}</div>}
					</div>,
				);
			}

			if (reactComponent) {
				componentsToRender.push(
					<div key="react" className="flex flex-col gap-0">
						{reactComponent}
						{reactLinkComponent && (
							<div className="mt-1">{reactLinkComponent}</div>
						)}
					</div>,
				);
			}

			return componentsToRender;
		}

		// Otherwise, fall back to children
		return children;
	};

	// Determine which render type options to show based on available components
	const getRenderTypeOptions = () => {
		const options: SlideToggleOption<"bmp" | "png" | "svg">[] = [];

		if (bmpComponent) {
			options.push({
				value: "bmp",
				icon: undefined,
				label: "BMP",
				ariaLabel: "BMP rendering",
			});
		}

		if (pngComponent) {
			options.push({
				value: "png",
				icon: undefined,
				label: "PNG",
				ariaLabel: "PNG rendering",
			});
		}

		if (svgComponent) {
			options.push({
				value: "svg",
				icon: undefined,
				label: "SVG",
				ariaLabel: "SVG rendering",
			});
		}

		return options;
	};

	return (
		<div className="flex flex-col gap-4 items-start">
			<div className="flex flex-wrap gap-2">
				<SlideToggle<"columns" | "rows">
					options={layoutOptions}
					value={layout}
					onChange={handleLayoutChange}
				/>
				<SlideToggle<"full" | "half">
					options={scaleOptions}
					value={scale}
					onChange={handleScaleChange}
				/>
				{(bmpComponent || pngComponent || svgComponent) && (
					<SlideToggle<"bmp" | "png" | "svg">
						options={getRenderTypeOptions()}
						value={renderType}
						onChange={handleRenderTypeChange}
					/>
				)}
			</div>
			<div
				className={cn(
					"w-full",
					layout === "rows" && "max-w-full overflow-x-auto pb-4",
					scale === "half" && "overflow-hidden",
				)}
			>
				<div
					className={cn(
						"grid gap-4 transition-all duration-200",
						layout === "columns" ? "grid-cols-2" : "grid-cols-1",
						scale === "half" && "transform scale-50 origin-top-left",
					)}
					style={{
						width: getContainerWidth({
							l: layout,
							sCW: singleColumnWidth,
							sP: spacing,
						}),
						height: scale === "half" ? "200%" : "auto",
						transformOrigin: "top left",
					}}
				>
					{renderContent()}
				</div>
			</div>
		</div>
	);
};

RecipePreviewLayout.displayName = "RecipePreviewLayout";

export { RecipePreviewLayout };
