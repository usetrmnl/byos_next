import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getAppBaseUrl(): URL {
	const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
	if (raw) {
		try {
			return new URL(raw);
		} catch {
			// fall through to the default below
		}
	}
	return new URL("http://localhost:3000");
}
