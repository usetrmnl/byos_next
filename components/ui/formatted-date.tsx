"use client";

import { useEffect, useState } from "react";

interface FormattedDateProps {
	dateString: string;
	options?: Intl.DateTimeFormatOptions;
	className?: string;
}

export const FormattedDate = ({
	dateString,
	options,
	className,
}: FormattedDateProps) => {
	// Initialize with a consistent format that matches SSR
	const date = new Date(dateString);
	const isoDate = date.toISOString().split("T")[0];
	const [year, month, day] = isoDate.split("-");
	const fallbackDate = `${month}/${day}/${year}`;

	const [formattedDate, setFormattedDate] = useState<string>(fallbackDate);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
		const dateObj = new Date(dateString);
		const formatted = dateObj.toLocaleDateString(undefined, options);
		setFormattedDate(formatted);
	}, [dateString, options]);

	// During SSR and initial client render, show consistent format
	// After mount, show locale-specific format
	return (
		<span className={className} suppressHydrationWarning={!isMounted}>
			{formattedDate}
		</span>
	);
};
