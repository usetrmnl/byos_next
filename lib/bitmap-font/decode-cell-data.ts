const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** Decode legacy base64-packed binary (0/1 bits) used by the generator. */
export function base64CellDataToBinary(base64: string): string {
	if (typeof Buffer !== "undefined") {
		const bytes = Buffer.from(base64, "base64");
		let binary = "";
		for (const byte of bytes) {
			binary += byte.toString(2).padStart(8, "0");
		}
		return binary;
	}

	const binary = atob(base64);
	return Array.from(binary)
		.map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
		.join("");
}

function decodeLiteralCellData(data: string, width: number, cellHeight: number): boolean[][] {
	const total = width * cellHeight;
	const padded = data.padEnd(total, "A").slice(0, total);
	const grid: boolean[][] = [];

	for (let row = 0; row < cellHeight; row++) {
		const cells: boolean[] = [];
		for (let col = 0; col < width; col++) {
			const ch = padded[row * width + col] ?? "A";
			cells.push(ch !== "A");
		}
		grid.push(cells);
	}

	return grid;
}

function decodeBinaryCellData(data: string, width: number, cellHeight: number): boolean[][] {
	const total = width * cellHeight;
	const binary = data.padEnd(total, "0").slice(0, total);
	const grid: boolean[][] = [];

	for (let row = 0; row < cellHeight; row++) {
		const cells: boolean[] = [];
		for (let col = 0; col < width; col++) {
			cells.push(binary[row * width + col] === "1");
		}
		grid.push(cells);
	}

	return grid;
}

function shouldDecodeAsBase64(data: string): boolean {
	if (/^[01]+$/.test(data)) return false;
	if (!BASE64_PATTERN.test(data)) return false;
	if (data.length % 4 === 1) return false;

	try {
		base64CellDataToBinary(data);
		return true;
	} catch {
		return false;
	}
}

function shouldUseLiteralAIData(
	data: string,
	width: number,
	cellHeight: number,
): boolean {
	return /^[AI]+$/.test(data) && data.length === width * cellHeight;
}

/**
 * Decode legacy cell `data` into a row-major boolean grid.
 * Supports base64-packed 0/1 data (current generator) and literal `A`/non-`A` rows.
 */
export function decodeCellData(
	data: string,
	width: number,
	cellHeight: number,
): boolean[][] {
	if (/^[01]+$/.test(data)) {
		return decodeBinaryCellData(data, width, cellHeight);
	}

	if (shouldUseLiteralAIData(data, width, cellHeight)) {
		return decodeLiteralCellData(data, width, cellHeight);
	}

	if (shouldDecodeAsBase64(data)) {
		const binary = base64CellDataToBinary(data);
		return decodeBinaryCellData(binary, width, cellHeight);
	}

	return decodeLiteralCellData(data, width, cellHeight);
}
