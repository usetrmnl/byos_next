import type React from "react";
import { createElement } from "react";
import {
	getTrmnlModelClassName,
	getTrmnlModelStyle,
} from "@/lib/trmnl/model-css";
import type { TrmnlModel } from "@/lib/trmnl/types";

export function wrapWithTrmnlCss(
	element: React.ReactElement,
	model: TrmnlModel | null,
	width: number,
	height: number,
): React.ReactElement {
	const className = getTrmnlModelClassName(model);
	const vars = getTrmnlModelStyle(model);
	if (!className && !vars) return element;
	return createElement(
		"div",
		{
			className: className || undefined,
			style: { width, height, display: "flex", ...vars },
		},
		element,
	);
}

export function wrapLogicalCanvasToTarget(
	element: React.ReactElement,
	layoutWidth: number,
	layoutHeight: number,
	targetWidth: number,
	targetHeight: number,
): React.ReactElement {
	if (layoutWidth === targetWidth && layoutHeight === targetHeight) {
		return element;
	}

	const scaleX = targetWidth / layoutWidth;
	const scaleY = targetHeight / layoutHeight;
	return createElement(
		"div",
		{
			style: {
				display: "flex",
				width: targetWidth,
				height: targetHeight,
				overflow: "hidden",
			},
		},
		createElement(
			"div",
			{
				style: {
					display: "flex",
					width: layoutWidth,
					height: layoutHeight,
					transform: `scale(${scaleX}, ${scaleY})`,
					transformOrigin: "top left",
				},
			},
			element,
		),
	);
}
