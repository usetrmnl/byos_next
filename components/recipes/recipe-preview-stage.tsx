"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { DeviceFrame } from "@/components/common/device-frame";
import { ScreenPreviewImage } from "@/components/common/screen-preview-image";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildScreenPreviewSrc } from "@/lib/render/preview-image";
import { DEFAULT_MODEL_NAME } from "@/lib/trmnl/types";
import { cn } from "@/lib/utils";

type FormatKey = "device" | "react";

type PreviewModel = {
	name: string;
	label: string;
	width: number;
	height: number;
	palette_ids: string[];
};

type PreviewPalette = {
	id: string;
	name: string;
};

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
	deviceNode?: ReactNode;
	reactNode?: ReactNode;
	devicePipeline?: ReactNode;
	reactPipeline?: ReactNode;
	defaultFormat?: FormatKey;
	/** When provided, a model selector drives device / React preview resolution. */
	trmnlModels?: PreviewModel[];
	trmnlPalettes?: PreviewPalette[];
	/**
	 * When false, the React tab keeps the server-rendered preview (e.g. Liquid
	 * recipes: `/recipes/.../preview` only exists for React components).
	 */
	simulateReactPreviewInIframe?: boolean;
}

const FORMAT_LABELS: Record<FormatKey, string> = {
	device: "Device",
	react: "React",
};

export function RecipePreviewStage({
	slug,
	isPortrait,
	deviceNode,
	reactNode,
	devicePipeline,
	reactPipeline,
	defaultFormat = "device",
	trmnlModels,
	trmnlPalettes,
	simulateReactPreviewInIframe = true,
}: RecipePreviewStageProps) {
	const router = useRouter();
	const [format, setFormat] = useState<FormatKey>(defaultFormat);
	const reactFrameRef = useRef<HTMLDivElement>(null);
	const [reactFrameSize, setReactFrameSize] = useState({ width: 0, height: 0 });
	const sortedModels = useMemo(
		() =>
			[...(trmnlModels ?? [])].sort(
				(a, b) =>
					a.label.localeCompare(b.label, undefined, { sensitivity: "base" }) ||
					a.name.localeCompare(b.name),
			),
		[trmnlModels],
	);
	const [modelName, setModelName] = useState<string>(() => {
		if (!sortedModels.length) return DEFAULT_MODEL_NAME;
		const preferred = sortedModels.find((m) => m.name === DEFAULT_MODEL_NAME);
		return preferred?.name ?? sortedModels[0].name;
	});
	const initialModel =
		sortedModels.find((m) => m.name === DEFAULT_MODEL_NAME) ?? sortedModels[0];
	const [paletteId, setPaletteId] = useState<string>(() =>
		chooseDefaultPaletteId(initialModel ?? null),
	);
	const [loadedReactPreviewSrc, setLoadedReactPreviewSrc] = useState<
		string | null
	>(null);

	const deviceSimActive = sortedModels.length > 0;

	const selectedModel = useMemo(() => {
		if (!sortedModels.length) return null;
		return (
			sortedModels.find((m) => m.name === modelName) ??
			sortedModels.find((m) => m.name === DEFAULT_MODEL_NAME) ??
			sortedModels[0]
		);
	}, [sortedModels, modelName]);

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
		{ key: "device", node: deviceNode, pipeline: devicePipeline },
		{ key: "react", node: reactNode, pipeline: reactPipeline },
	].filter((f) => f.node !== undefined) as typeof formats;

	const active = formats.find((f) => f.key === format) || formats[0];
	const activeKey = active?.key ?? defaultFormat;

	const useModelFrame =
		deviceSimActive &&
		simWidth != null &&
		simHeight != null &&
		(activeKey === "device" ||
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
			? buildScreenPreviewSrc(
					slug,
					{ model: selectedModel.name, palette_id: selectedPaletteId || null },
					simWidth,
					simHeight,
				)
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
	const reactPreviewLoading =
		reactPreviewSrc != null && loadedReactPreviewSrc !== reactPreviewSrc;

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
		if (activeKey === "device" && devicePreviewSrc) {
			return (
				<ScreenPreviewImage
					src={devicePreviewSrc}
					alt={`${selectedModel.label} ${FORMAT_LABELS[activeKey]} preview`}
					className="absolute inset-0"
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
					{reactPreviewLoading && (
						<Skeleton
							aria-hidden
							className="absolute inset-0 h-full w-full rounded-none bg-neutral-300 dark:bg-neutral-700"
						/>
					)}
					<iframe
						title={`${selectedModel.label} recipe preview`}
						src={reactPreviewSrc}
						className="origin-top-left border-0 bg-background"
						style={{
							width: simWidth,
							height: simHeight,
							transform: `scale(${reactPreviewScale})`,
							opacity: reactPreviewLoading ? 0 : 1,
							transition: "opacity 150ms",
						}}
						onLoad={() => setLoadedReactPreviewSrc(reactPreviewSrc)}
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

				{deviceSimActive && selectedModel && (
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center">
							<Label htmlFor="recipe-preview-model" className="sr-only">
								Device model
							</Label>
							<Select
								value={selectedModel.name}
								onValueChange={(value) => {
									setModelName(value);
									const nextModel = sortedModels.find((m) => m.name === value);
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
									{sortedModels.map((m) => (
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
							Device preview uses <code className="font-mono">/api/bitmap</code>
							; React scales the selected screen size into the frame.
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
