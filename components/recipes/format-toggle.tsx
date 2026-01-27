"use client";

import { useRouter } from "next/navigation";
import {
	SlideToggle,
	type SlideToggleOption,
} from "@/components/ui/slide-toggle";

export const FormatToggle = ({
	slug,
	isPortrait,
}: {
	slug: string;
	isPortrait: boolean;
}) => {
	const router = useRouter();

	const formatOptions: SlideToggleOption<"landscape" | "portrait">[] = [
		{
			value: "landscape",
			label: "Landscape",
			ariaLabel: "Landscape format",
		},
		{
			value: "portrait",
			label: "Portrait",
			ariaLabel: "Portrait format",
		},
	];

	const handleFormatChange = (value: "landscape" | "portrait") => {
		const url =
			value === "portrait"
				? `/recipes/${slug}?format=portrait`
				: `/recipes/${slug}`;
		router.push(url);
	};

	return (
		<SlideToggle<"landscape" | "portrait">
			options={formatOptions}
			value={isPortrait ? "portrait" : "landscape"}
			onChange={handleFormatChange}
		/>
	);
};
