"use client";

import { useRouter } from "next/navigation";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Dithering methods - copied from @/utils/render-bmp to avoid importing sharp in client component
export const DitheringMethod = {
	FLOYD_STEINBERG: "floyd-steinberg",
	ATKINSON: "atkinson",
	BAYER: "bayer",
	RANDOM: "random",
	THRESHOLD: "threshold",
} as const;

export type DitheringMethodType =
	(typeof DitheringMethod)[keyof typeof DitheringMethod];

interface BitmapOptionsFormProps {
	slug: string;
	isPortrait: boolean;
	currentDither: DitheringMethodType;
	currentBitDepth: 1 | 2 | 4;
}

export const BitmapOptionsForm = ({
	slug,
	isPortrait,
	currentDither,
	currentBitDepth,
}: BitmapOptionsFormProps) => {
	const router = useRouter();

	const buildUrl = (dither: DitheringMethodType, bitdepth: 1 | 2 | 4) => {
		const params = new URLSearchParams();
		if (isPortrait) {
			params.set("format", "portrait");
		}
		if (dither !== DitheringMethod.FLOYD_STEINBERG) {
			params.set("dither", dither);
		}
		if (bitdepth !== 2) {
			params.set("bitdepth", bitdepth.toString());
		}
		const queryString = params.toString();
		return queryString ? `/recipes/${slug}?${queryString}` : `/recipes/${slug}`;
	};

	const handleDitherChange = (value: string) => {
		const newDither = value as DitheringMethodType;
		const url = buildUrl(newDither, currentBitDepth);
		router.push(url);
	};

	const handleBitDepthChange = (value: string) => {
		const newBitDepth = parseInt(value, 10) as 1 | 2 | 4;
		const url = buildUrl(currentDither, newBitDepth);
		router.push(url);
	};

	const ditherOptions = [
		{ value: DitheringMethod.FLOYD_STEINBERG, label: "Floyd-Steinberg" },
		{ value: DitheringMethod.ATKINSON, label: "Atkinson" },
		{ value: DitheringMethod.BAYER, label: "Bayer" },
		{ value: DitheringMethod.RANDOM, label: "Random" },
		{ value: DitheringMethod.THRESHOLD, label: "Threshold (No Dither)" },
	];

	const bitDepthOptions = [
		{ value: "1", label: "1-bit (Black & White)" },
		{ value: "2", label: "2-bit (4 Grays)" },
		{ value: "4", label: "4-bit (16 Grays)" },
	];

	return (
		<div className="flex gap-2 items-center">
			<Select value={currentDither} onValueChange={handleDitherChange}>
				<SelectTrigger className="w-[160px] h-8 text-sm">
					<SelectValue placeholder="Dithering" />
				</SelectTrigger>
				<SelectContent>
					{ditherOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={currentBitDepth.toString()}
				onValueChange={handleBitDepthChange}
			>
				<SelectTrigger className="w-[140px] h-8 text-sm">
					<SelectValue placeholder="Bit Depth" />
				</SelectTrigger>
				<SelectContent>
					{bitDepthOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};
