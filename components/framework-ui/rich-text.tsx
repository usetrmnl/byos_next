import React from "react";
import clsx from "clsx";

interface RichTextProps {
	align?: "left" | "center" | "right";
	gap?: "small" | "large";
	className?: string;
	children: React.ReactNode;
}

interface RichTextContentProps {
	align?: "left" | "center" | "right";
	textAlign?: "left" | "center" | "right";
	size?: "small" | "base" | "large" | "xlarge" | "xxlarge" | "xxxlarge";
	gap?: boolean;
	className?: string;
	children: React.ReactNode;
}

function RichText({ align, gap, className, children }: RichTextProps) {
	return (
		<div
			className={clsx(
				"richtext",
				align && `richtext--${align}`,
				gap === "large" && "gap--large",
				gap === "small" && "gap",
				className,
			)}
		>
			{children}
		</div>
	);
}

function RichTextContent({
	align,
	textAlign,
	size,
	gap,
	className,
	children,
}: RichTextContentProps) {
	return (
		<div
			className={clsx(
				"content",
				align && `content--${align}`,
				textAlign && `text--${textAlign}`,
				size && `content--${size}`,
				gap && "gap",
				className,
			)}
		>
			{children}
		</div>
	);
}

RichText.Content = RichTextContent;

export default RichText;
