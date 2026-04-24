"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { DeviceFrame } from "@/components/common/device-frame";
import { cn } from "@/lib/utils";

type FormatKey = "bmp" | "png" | "react";

interface RecipePreviewStageProps {
	slug: string;
	isPortrait: boolean;
	bmpNode?: ReactNode;
	pngNode?: ReactNode;
	reactNode?: ReactNode;
	bmpPipeline?: ReactNode;
	pngPipeline?: ReactNode;
	reactPipeline?: ReactNode;
	defaultFormat?: FormatKey;
}

const FORMAT_LABELS: Record<FormatKey, string> = {
	bmp: "BMP",
	png: "PNG",
	react: "React",
};

export function RecipePreviewStage({
	slug,
	isPortrait,
	bmpNode,
	pngNode,
	reactNode,
	bmpPipeline,
	pngPipeline,
	reactPipeline,
	defaultFormat = "bmp",
}: RecipePreviewStageProps) {
	const router = useRouter();
	const [format, setFormat] = useState<FormatKey>(defaultFormat);

	const formats: { key: FormatKey; node: ReactNode; pipeline: ReactNode }[] = [
		{ key: "bmp", node: bmpNode, pipeline: bmpPipeline },
		{ key: "png", node: pngNode, pipeline: pngPipeline },
		{ key: "react", node: reactNode, pipeline: reactPipeline },
	].filter((f) => f.node !== undefined) as typeof formats;

	const active = formats.find((f) => f.key === format) || formats[0];
	const activeKey = active?.key ?? defaultFormat;

	const handleOrientationChange = (nextPortrait: boolean) => {
		if (nextPortrait === isPortrait) return;
		router.push(
			nextPortrait ? `/recipes/${slug}?format=portrait` : `/recipes/${slug}`,
		);
	};

	return (
		<div className="overflow-hidden rounded-2xl border bg-card">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
				<div className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
					{formats.map((f) => (
						<button
							key={f.key}
							type="button"
							onClick={() => setFormat(f.key)}
							className={cn(
								"rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
								activeKey === f.key
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
							aria-pressed={activeKey === f.key}
						>
							{FORMAT_LABELS[f.key]}
						</button>
					))}
				</div>

				<div className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-0.5">
					<button
						type="button"
						onClick={() => handleOrientationChange(false)}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
							!isPortrait
								? "bg-foreground text-background"
								: "text-muted-foreground hover:text-foreground",
						)}
						aria-pressed={!isPortrait}
					>
						<Monitor className="h-3.5 w-3.5" />
						Landscape
					</button>
					<button
						type="button"
						onClick={() => handleOrientationChange(true)}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
							isPortrait
								? "bg-foreground text-background"
								: "text-muted-foreground hover:text-foreground",
						)}
						aria-pressed={isPortrait}
					>
						<Smartphone className="h-3.5 w-3.5" />
						Portrait
					</button>
				</div>
			</div>

			{/* Stage */}
			<div className="flex items-center justify-center bg-[radial-gradient(circle_at_50%_0%,theme(colors.muted/40),transparent_70%)] px-6 py-8">
				<div
					className={cn(
						"w-full",
						isPortrait ? "max-w-[360px]" : "max-w-[720px]",
					)}
				>
					<DeviceFrame size="lg" portrait={isPortrait}>
						{active?.node}
					</DeviceFrame>
				</div>
			</div>

			{/* Pipeline caption */}
			{active?.pipeline && (
				<div className="border-t bg-muted/20 px-4 py-3">
					<div className="flex items-start gap-3">
						<span className="mt-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Pipeline
						</span>
						<div className="flex-1 text-xs text-muted-foreground [&_a]:text-primary [&_a]:hover:underline">
							{active.pipeline}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
