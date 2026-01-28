"use client";

import { useRouter } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const FormatToggle = ({
	slug,
	isPortrait,
}: {
	slug: string;
	isPortrait: boolean;
}) => {
	const router = useRouter();

	const handleFormatChange = (value: string) => {
		if (!value) return; // Prevent deselection
		const url =
			value === "portrait"
				? `/recipes/${slug}?format=portrait`
				: `/recipes/${slug}`;
		router.push(url);
	};

	return (
		<ToggleGroup
			type="single"
			value={isPortrait ? "portrait" : "landscape"}
			onValueChange={handleFormatChange}
			className="inline-flex items-center rounded-md border bg-muted p-1"
		>
			<ToggleGroupItem
				value="landscape"
				aria-label="Landscape format"
				className="h-full rounded-sm px-3 py-1.5 text-sm font-bold font-mono data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
			>
				Landscape
			</ToggleGroupItem>
			<ToggleGroupItem
				value="portrait"
				aria-label="Portrait format"
				className="h-full rounded-sm px-3 py-1.5 text-sm font-bold font-mono data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
			>
				Portrait
			</ToggleGroupItem>
		</ToggleGroup>
	);
};
