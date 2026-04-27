"use client";

import { Monitor, Smartphone } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { DeviceFrame } from "@/components/common/device-frame";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type FormatKey = "bmp" | "png" | "react";
const DEFAULT_MODEL_NAME = "og_plus";

type PreviewModel = {
	name: string;
	label: string;
	width: number;
	height: number;
	mime_type: string;
	palette_ids: string[];
};

type PreviewPalette = {
	id: string;
	name: string;
};

/** Aligns with `getImageFilenameExtension` in `lib/render/device-image.ts` (client-safe). */
function modelImagePathExtension(mimeType: string): string {
	const map: Record<string, string> = {
		"image/bmp": "bmp",
		"image/png": "png",
		"image/webp": "webp",
	};
	return map[mimeType] ?? mimeType.split("/").pop() ?? "png";
}

function chooseDefaultPaletteId(model: PreviewModel | null): string {
	if (!model) return "";
	return (
		model.palette_ids.find((id) => id.startsWith("color-")) ??
		model.palette_ids[0] ??
		""
	);
}

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
	/** When provided, a model selector drives BMP / React preview resolution. */
	trmnlModels?: PreviewModel[];
	trmnlPalettes?: PreviewPalette[];
	/**
	 * When false, the React tab keeps the server-rendered preview (e.g. Liquid
	 * recipes: `/recipes/.../preview` only exists for React components).
	 */
	simulateReactPreviewInIframe?: boolean;
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
	trmnlModels,
	trmnlPalettes,
	simulateReactPreviewInIframe = true,
}: RecipePreviewStageProps) {
	const router = useRouter();
	const [format, setFormat] = useState<FormatKey>(defaultFormat);
	const reactFrameRef = useRef<HTMLDivElement>(null);
	const [reactFrameSize, setReactFrameSize] = useState({ width: 0, height: 0 });
	const [modelName, setModelName] = useState<string>(() => {
		if (!trmnlModels?.length) return DEFAULT_MODEL_NAME;
		const preferred = trmnlModels.find((m) => m.name === DEFAULT_MODEL_NAME);
		return preferred?.name ?? trmnlModels[0].name;
	});
	const initialModel =
		trmnlModels?.find((m) => m.name === DEFAULT_MODEL_NAME) ?? trmnlModels?.[0];
	const [paletteId, setPaletteId] = useState<string>(() =>
		chooseDefaultPaletteId(initialModel ?? null),
	);

	const deviceSimActive = Boolean(trmnlModels && trmnlModels.length > 0);

	const selectedModel = useMemo(() => {
		if (!trmnlModels?.length) return null;
		return (
			trmnlModels.find((m) => m.name === modelName) ??
			trmnlModels.find((m) => m.name === DEFAULT_MODEL_NAME) ??
			trmnlModels[0]
		);
	}, [trmnlModels, modelName]);

	const modelPalettes = useMemo(() => {
		if (!selectedModel || !trmnlPalettes?.length) return [];
		return selectedModel.palette_ids
			.map((id) => trmnlPalettes.find((palette) => palette.id === id))
			.filter((palette): palette is PreviewPalette => Boolean(palette));
	}, [selectedModel, trmnlPalettes]);

	const selectedPaletteId = selectedModel?.palette_ids.includes(paletteId)
		? paletteId
		: chooseDefaultPaletteId(selectedModel);
	const selectedPalette = modelPalettes.find(
		(palette) => palette.id === selectedPaletteId,
	);

	const simWidth =
		selectedModel != null
			? isPortrait
				? selectedModel.height
				: selectedModel.width
			: null;
	const simHeight =
		selectedModel != null
			? isPortrait
				? selectedModel.width
				: selectedModel.height
			: null;

	const formats: { key: FormatKey; node: ReactNode; pipeline: ReactNode }[] = [
		{ key: "bmp", node: bmpNode, pipeline: bmpPipeline },
		{ key: "png", node: pngNode, pipeline: pngPipeline },
		{ key: "react", node: reactNode, pipeline: reactPipeline },
	].filter((f) => f.node !== undefined) as typeof formats;

	const active = formats.find((f) => f.key === format) || formats[0];
	const activeKey = active?.key ?? defaultFormat;

	const useModelFrame =
		deviceSimActive &&
		simWidth != null &&
		simHeight != null &&
		(activeKey === "bmp" ||
			activeKey === "png" ||
			(activeKey === "react" && simulateReactPreviewInIframe));

	const screenAspectRatio =
		useModelFrame && simWidth != null && simHeight != null
			? `${simWidth} / ${simHeight}`
			: undefined;

	const devicePreviewSrc =
		deviceSimActive &&
		selectedModel != null &&
		simWidth != null &&
		simHeight != null
			? (() => {
					const ext = modelImagePathExtension(selectedModel.mime_type);
					const params = new URLSearchParams();
					params.set("model", selectedModel.name);
					if (selectedPaletteId) params.set("palette_id", selectedPaletteId);
					if (selectedModel.mime_type === "image/bmp") {
						params.set("width", String(simWidth));
						params.set("height", String(simHeight));
						params.set("grayscale", "2");
					}
					return `/api/bitmap/${slug}.${ext}?${params.toString()}`;
				})()
			: null;

	const reactPreviewSrc =
		deviceSimActive &&
		simulateReactPreviewInIframe &&
		selectedModel != null &&
		simWidth != null &&
		simHeight != null
			? (() => {
					const params = new URLSearchParams();
					params.set("width", String(simWidth));
					params.set("height", String(simHeight));
					params.set("model", selectedModel.name);
					if (selectedPaletteId) params.set("palette_id", selectedPaletteId);
					return `/recipes/${slug}/preview?${params.toString()}`;
				})()
			: null;
	const reactPreviewScale =
		simWidth != null &&
		simHeight != null &&
		reactFrameSize.width > 0 &&
		reactFrameSize.height > 0
			? Math.min(
					reactFrameSize.width / simWidth,
					reactFrameSize.height / simHeight,
				)
			: 1;

	useEffect(() => {
		if (activeKey !== "react" || !reactPreviewSrc) return;
		const node = reactFrameRef.current;
		if (!node) return;

		const updateSize = () => {
			const rect = node.getBoundingClientRect();
			setReactFrameSize({ width: rect.width, height: rect.height });
		};
		updateSize();

		const observer = new ResizeObserver(updateSize);
		observer.observe(node);
		return () => observer.disconnect();
	}, [activeKey, reactPreviewSrc]);

	const handleOrientationChange = (nextPortrait: boolean) => {
		if (nextPortrait === isPortrait) return;
		router.push(
			nextPortrait ? `/recipes/${slug}?format=portrait` : `/recipes/${slug}`,
		);
	};

	const stageContent = (() => {
		if (
			!deviceSimActive ||
			!selectedModel ||
			simWidth == null ||
			simHeight == null
		) {
			return active?.node;
		}
		if ((activeKey === "bmp" || activeKey === "png") && devicePreviewSrc) {
			return (
				<Image
					width={simWidth}
					height={simHeight}
					src={devicePreviewSrc}
					unoptimized
					style={{ imageRendering: "pixelated" }}
					alt={`${selectedModel.label} ${FORMAT_LABELS[activeKey]} preview`}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			);
		}
		if (
			activeKey === "react" &&
			reactPreviewSrc &&
			simulateReactPreviewInIframe
		) {
			return (
				<div ref={reactFrameRef} className="absolute inset-0 overflow-hidden">
					<iframe
						title={`${selectedModel.label} recipe preview`}
						src={reactPreviewSrc}
						className="origin-top-left border-0 bg-background"
						style={{
							width: simWidth,
							height: simHeight,
							transform: `scale(${reactPreviewScale})`,
						}}
					/>
				</div>
			);
		}
		return active?.node;
	})();
	const toolbarToggleItemClass =
		"h-8 bg-background px-3 text-xs font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-xs data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground";
	const toolbarSelectClass =
		"h-8 rounded-lg bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs";

	return (
		<div className="overflow-hidden rounded-2xl border bg-card">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-2.5">
				<ToggleGroup
					type="single"
					value={activeKey}
					onValueChange={(value) => {
						if (value) setFormat(value as FormatKey);
					}}
					variant="outline"
					size="sm"
				>
					{formats.map((f) => (
						<ToggleGroupItem
							key={f.key}
							value={f.key}
							className={toolbarToggleItemClass}
							aria-label={`Show ${FORMAT_LABELS[f.key]} preview`}
						>
							{FORMAT_LABELS[f.key]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>

				{deviceSimActive && trmnlModels && selectedModel && (
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center">
							<Label htmlFor="recipe-preview-model" className="sr-only">
								Device model
							</Label>
							<Select
								value={selectedModel.name}
								onValueChange={(value) => {
									setModelName(value);
									const nextModel = trmnlModels.find((m) => m.name === value);
									setPaletteId(chooseDefaultPaletteId(nextModel ?? null));
								}}
							>
								<SelectTrigger
									id="recipe-preview-model"
									size="sm"
									className={cn(
										toolbarSelectClass,
										"w-[min(100vw-2rem,260px)] sm:w-[260px]",
									)}
								>
									<SelectValue placeholder="Model" />
								</SelectTrigger>
								<SelectContent>
									{trmnlModels.map((m) => (
										<SelectItem key={m.name} value={m.name}>
											{m.label}{" "}
											<span className="text-muted-foreground tabular-nums">
												({m.width}×{m.height})
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{modelPalettes.length > 1 && selectedPaletteId && (
							<div className="flex items-center">
								<Label htmlFor="recipe-preview-palette" className="sr-only">
									Palette
								</Label>
								<Select
									value={selectedPaletteId}
									onValueChange={(value) => setPaletteId(value)}
								>
									<SelectTrigger
										id="recipe-preview-palette"
										size="sm"
										className={cn(
											toolbarSelectClass,
											"w-[min(100vw-2rem,210px)] sm:w-[210px]",
										)}
									>
										<SelectValue placeholder="Palette" />
									</SelectTrigger>
									<SelectContent>
										{modelPalettes.map((palette) => (
											<SelectItem key={palette.id} value={palette.id}>
												{palette.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				)}

				<ToggleGroup
					type="single"
					value={isPortrait ? "portrait" : "landscape"}
					onValueChange={(value) => {
						if (value === "landscape") handleOrientationChange(false);
						if (value === "portrait") handleOrientationChange(true);
					}}
					variant="outline"
					size="sm"
				>
					<ToggleGroupItem
						value="landscape"
						className={toolbarToggleItemClass}
						aria-label="Landscape preview"
					>
						<Monitor className="h-3.5 w-3.5" />
						Landscape
					</ToggleGroupItem>
					<ToggleGroupItem
						value="portrait"
						className={toolbarToggleItemClass}
						aria-label="Portrait preview"
					>
						<Smartphone className="h-3.5 w-3.5" />
						Portrait
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{deviceSimActive &&
				selectedModel &&
				simWidth != null &&
				simHeight != null && (
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground">
						<span className="font-medium text-foreground">
							{selectedModel.label}
						</span>
						<span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
							{simWidth}×{simHeight}
						</span>
						{selectedPalette && (
							<span className="rounded-md bg-muted px-1.5 py-0.5">
								{selectedPalette.name}
							</span>
						)}
						<span className="text-muted-foreground/80">
							BMP/PNG use <code className="font-mono">/api/bitmap</code>; React
							scales the selected screen size into the frame.
						</span>
					</div>
				)}

			{/* Stage */}
			<div className="flex items-center justify-center bg-[radial-gradient(circle_at_50%_0%,theme(colors.muted/40),transparent_70%)] px-6 py-8">
				<div
					className={cn(
						"w-full",
						isPortrait ? "max-w-[360px]" : "max-w-[720px]",
					)}
				>
					<DeviceFrame
						size="lg"
						portrait={screenAspectRatio ? false : isPortrait}
						screenAspectRatio={screenAspectRatio}
					>
						{stageContent}
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
