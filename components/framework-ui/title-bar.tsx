import React from "react";
import clsx from "clsx";

interface TitleBarProps {
	className?: string;
	children: React.ReactNode;
}

interface TitleBarImageProps {
	src: string;
	alt?: string;
	className?: string;
}

interface TitleBarTitleProps {
	children: React.ReactNode;
	className?: string;
}

interface TitleBarInstanceProps {
	children: React.ReactNode;
	className?: string;
}

function TitleBar({ className, children }: TitleBarProps) {
	return <div className={clsx("title_bar", className)}>{children}</div>;
}

function TitleBarImage({ src, alt, className }: TitleBarImageProps) {
	return <img className={clsx("image", className)} src={src} alt={alt} />;
}

function TitleBarTitle({ children, className }: TitleBarTitleProps) {
	return <span className={clsx("title", className)}>{children}</span>;
}

function TitleBarInstance({ children, className }: TitleBarInstanceProps) {
	return <span className={clsx("instance", className)}>{children}</span>;
}

TitleBar.Image = TitleBarImage;
TitleBar.Title = TitleBarTitle;
TitleBar.Instance = TitleBarInstance;

export default TitleBar;
