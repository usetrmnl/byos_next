/**
 * Recipe-runtime logger. Wraps console with NODE_ENV / DEBUG gating so dev
 * logs stay loud and prod stays quiet. Re-exported from recipe-renderer.ts
 * for legacy import paths.
 */
const verbose = () =>
	process.env.NODE_ENV !== "production" || process.env.DEBUG === "true";

export const logger = {
	info: (message: string) => {
		if (verbose()) console.log(message);
	},
	error: (message: string, error?: unknown) => {
		if (error) console.error(message, error);
		else console.error(message);
	},
	success: (message: string) => {
		if (verbose()) console.log(`✅ ${message}`);
	},
	warn: (message: string, error?: unknown) => {
		if (!verbose()) return;
		if (error) console.warn(message, error);
		else console.warn(message);
	},
};
