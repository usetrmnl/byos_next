export function formatErrorMessage(error: unknown): string {
	if (error instanceof AggregateError) {
		const messages = error.errors
			.map((nestedError) => formatErrorMessage(nestedError))
			.filter(Boolean);

		return messages.length > 0
			? messages.join("; ")
			: error.message || "AggregateError";
	}

	if (error instanceof Error) {
		return error.message || error.name || "Unknown error";
	}

	return String(error);
}
