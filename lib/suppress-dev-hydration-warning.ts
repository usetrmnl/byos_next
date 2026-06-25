/** Dev-only: Cursor IDE injects `data-cursor-ref` before React hydrates. */
export const suppressDevHydrationWarning =
	process.env.NODE_ENV === "development";
