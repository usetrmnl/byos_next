"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

export type SlideToggleOption<T extends string> = {
	value: T;
	label: string;
	icon?: React.ReactNode;
	ariaLabel: string;
};

export type SlideToggleProps<T extends string> = {
	options: SlideToggleOption<T>[];
	value: T;
	onChange: (value: T) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">;

export function SlideToggle<T extends string>({
	className,
	options,
	value,
	onChange,
	...props
}: SlideToggleProps<T>) {
	if (!options || options.length < 2) {
		return null;
	}

	return (
		<div
			className={cn(
				"inline-flex items-center rounded-md border bg-muted p-1",
				className,
			)}
			{...props}
		>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					className={cn(
						"h-full inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-bold font-mono ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						value === option.value
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
					aria-label={option.ariaLabel}
				>
					{option.icon || option.label}
				</button>
			))}
		</div>
	);
}
