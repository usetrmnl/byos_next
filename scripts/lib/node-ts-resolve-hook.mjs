/**
 * Resolve extensionless relative imports to `.ts` for Node script runs.
 */
export async function resolve(specifier, context, nextResolve) {
	if (
		specifier.startsWith(".") &&
		!/\.(ts|tsx|js|mjs|cjs|json|node)$/.test(specifier)
	) {
		try {
			return await nextResolve(`${specifier}.ts`, context);
		} catch {
			// fall through
		}
	}

	return nextResolve(specifier, context);
}
