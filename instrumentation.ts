/**
 * Next.js boot hook. Runs ONCE per server process — not per request — so
 * we use it to seed the in-DB recipe catalog from the in-process React
 * recipe registry. Built-in recipes are defined in code, but the DB
 * still needs rows for foreign keys (mixup_slots, etc.) and for the
 * mixup picker UI.
 *
 * The runtime resolves React recipes from the registry directly, so this
 * sync is a one-shot bootstrap, never a request-time mirror.
 */
export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;
	if (process.env.NEXT_PHASE === "phase-production-build") return;
	if (process.env.SKIP_RECIPE_SYNC === "true") return;

	try {
		const { syncReactRecipes } = await import(
			"./lib/recipes/sync-react-recipes"
		);
		await syncReactRecipes();
	} catch (error) {
		console.warn("[instrumentation] Recipe sync failed at boot:", error);
	}
}
