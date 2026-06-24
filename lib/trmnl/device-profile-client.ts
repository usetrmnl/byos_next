import { resolveCompatiblePaletteId } from "./profile-resolution";
import {
	DEFAULT_MODEL_NAME,
	type TrmnlModel,
	type TrmnlPalette,
} from "./types";

export function resolveDeviceProfileFromCatalog({
	modelName,
	paletteId,
	models,
	palettes,
}: {
	modelName?: string | null;
	paletteId?: string | null;
	models: TrmnlModel[];
	palettes: TrmnlPalette[];
}) {
	const savedModelName = modelName?.trim() || null;
	const savedModelMatch = savedModelName
		? models.find((model) => model.name === savedModelName)
		: null;
	const selectedModel =
		savedModelMatch ??
		models.find((model) => model.name === DEFAULT_MODEL_NAME) ??
		models[0] ??
		null;
	const hasUnknownModel = Boolean(savedModelName && !savedModelMatch);
	const selectedPaletteIds = selectedModel?.palette_ids ?? [];
	const selectedPaletteId = resolveCompatiblePaletteId(
		selectedModel,
		paletteId,
	);
	const selectedPalette =
		palettes.find((palette) => palette.id === selectedPaletteId) ?? undefined;

	return {
		savedModelName,
		selectedModel,
		selectedPalette,
		selectedPaletteIds,
		hasUnknownModel,
	};
}
