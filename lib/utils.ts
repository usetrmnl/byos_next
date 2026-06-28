import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getAppBaseUrl(): URL {
	const candidates: Array<string | undefined> = [
		process.env.BETTER_AUTH_URL,
		process.env.VERCEL_PROJECT_PRODUCTION_URL &&
			`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
		process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
	];

	for (const candidate of candidates) {
		const raw = candidate?.trim();
		if (raw && URL.canParse(raw)) {
			return new URL(raw);
		}
	}

	return new URL("http://localhost:3000");
}
