// Convert base64 to binary string (for JSON storage)
export const base64ToBinary = (base64: string): string => {
	// Decode base64 to binary
	const binary = atob(base64);
	// Convert each byte to its binary representation
	return Array.from(binary)
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("");
};

// Convert binary string to base64 (for JSON storage)
export const binaryToBase64 = (binary: string): string => {
	// Group binary string into 8-bit chunks
	const bytes = [];
	for (let i = 0; i < binary.length; i += 8) {
		const chunk = binary.slice(i, Math.min(i + 8, binary.length));
		// Only process complete or padded chunks
		if (chunk.length > 0) {
			const paddedChunk = chunk.padEnd(8, "0");
			bytes.push(parseInt(paddedChunk, 2));
		}
	}

	// Convert bytes to base64
	return btoa(String.fromCharCode(...bytes));
};

// Convert binary string to 2D grid
export const binaryToGrid = (
	binary: string,
	width: number,
	height: number,
): number[][] => {
	const grid: number[][] = [];

	// Ensure binary string is the correct length
	const paddedBinary = binary.padEnd(width * height, "0");

	for (let y = 0; y < height; y++) {
		const row: number[] = [];
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			row.push(Number(paddedBinary[index]));
		}
		grid.push(row);
	}
	return grid;
};

// Convert 2D grid to binary string
export const gridToBinary = (grid: number[][]): string => {
	return grid.flat().join("");
};
