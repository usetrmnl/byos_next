const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export function base64CellDataToBinary(base64) {
	const bytes = Buffer.from(base64, "base64");
	let binary = "";
	for (const byte of bytes) {
		binary += byte.toString(2).padStart(8, "0");
	}
	return binary;
}

function decodeLiteralCellData(data, width, cellHeight) {
	const total = width * cellHeight;
	const padded = data.padEnd(total, "A").slice(0, total);
	const grid = [];

	for (let row = 0; row < cellHeight; row++) {
		const cells = [];
		for (let col = 0; col < width; col++) {
			const ch = padded[row * width + col] ?? "A";
			cells.push(ch !== "A");
		}
		grid.push(cells);
	}

	return grid;
}

function decodeBinaryCellData(data, width, cellHeight) {
	const total = width * cellHeight;
	const binary = data.padEnd(total, "0").slice(0, total);
	const grid = [];

	for (let row = 0; row < cellHeight; row++) {
		const cells = [];
		for (let col = 0; col < width; col++) {
			cells.push(binary[row * width + col] === "1");
		}
		grid.push(cells);
	}

	return grid;
}

function shouldDecodeAsBase64(data) {
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

function shouldUseLiteralAIData(data, width, cellHeight) {
	return /^[AI]+$/.test(data) && data.length === width * cellHeight;
}

export function decodeCellData(data, width, cellHeight) {
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
