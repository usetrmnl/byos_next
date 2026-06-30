export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringifyLogValue(value: unknown): string {
	if (typeof value === "string") {
		return value === "[object Object]" ? "Unstructured object log" : value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		return JSON.stringify(value);
	} catch {
		return "Unserializable object log";
	}
}
