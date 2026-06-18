import crypto from "node:crypto";

type BrowserRenderContext = {
	userId: string | null;
	expiresAt: number;
};

const CONTEXT_TTL_MS = 30_000;
const contexts = new Map<string, BrowserRenderContext>();

function cleanupExpiredContexts(now = Date.now()): void {
	for (const [token, context] of contexts) {
		if (context.expiresAt <= now) {
			contexts.delete(token);
		}
	}
}

export function createBrowserRenderContext(userId?: string | null): string {
	cleanupExpiredContexts();
	const token = crypto.randomUUID();
	contexts.set(token, {
		userId: userId ?? null,
		expiresAt: Date.now() + CONTEXT_TTL_MS,
	});
	return token;
}

export function consumeBrowserRenderContext(
	token?: string | null,
): string | null {
	if (!token) return null;
	cleanupExpiredContexts();
	const context = contexts.get(token);
	contexts.delete(token);
	return context?.userId ?? null;
}
