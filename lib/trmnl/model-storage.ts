import { findModel } from "./registry";
import { DEFAULT_MODEL_NAME } from "./types";

export type ModelStorageResolution = {
	modelName?: string;
	reportedUnknown?: string;
	resolvedModelName?: string;
	preservedExisting: boolean;
	defaulted: boolean;
};

export async function resolveModelForStorage(
	reportedModel: string | null | undefined,
	existingModel?: string | null,
): Promise<ModelStorageResolution> {
	const reported = reportedModel?.trim();
	if (!reported) {
		return { preservedExisting: false, defaulted: false };
	}

	if (await findModel(reported)) {
		return {
			modelName: reported,
			resolvedModelName: reported,
			preservedExisting: false,
			defaulted: false,
		};
	}

	const existing = existingModel?.trim();
	if (existing && (await findModel(existing))) {
		return {
			reportedUnknown: reported,
			resolvedModelName: existing,
			preservedExisting: true,
			defaulted: false,
		};
	}

	return {
		modelName: DEFAULT_MODEL_NAME,
		reportedUnknown: reported,
		resolvedModelName: DEFAULT_MODEL_NAME,
		preservedExisting: false,
		defaulted: true,
	};
}
