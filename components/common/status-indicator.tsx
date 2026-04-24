"use client";

import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
	status: "online" | "offline";
	size?: "sm" | "md";
	className?: string;
}

export const StatusIndicator = ({
	status,
	size = "md",
	className,
}: StatusIndicatorProps) => {
	// Determine size classes
	const sizeClasses = {
		sm: "size-1.5",
		md: "size-2",
	};

	// Determine color classes
	const colorClasses = status === "online" ? "bg-green-500" : "bg-red-500";

	return (
		<div className={cn("relative flex items-center", className)}>
			<span
				className={cn(
					"relative inline-flex rounded-full",
					sizeClasses[size],
					colorClasses,
					status === "online" ? "animate-radar-ping" : "",
				)}
			></span>
		</div>
	);
};
