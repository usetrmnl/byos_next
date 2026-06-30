import type { TrmnlModel } from "./types";

export function resolveCompatiblePaletteId(
	model: Pick<TrmnlModel, "palette_ids"> | null | undefined,
	paletteOverride?: string | null,
): string | null {
	const requestedPaletteId = paletteOverride?.trim() || null;
	if (requestedPaletteId && model?.palette_ids.includes(requestedPaletteId)) {
		return requestedPaletteId;
	}
	return model?.palette_ids[0] ?? null;
}
