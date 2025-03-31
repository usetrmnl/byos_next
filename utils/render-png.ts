import fs from "node:fs";
import { deflate, crc32 } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const CHUNK_iHDR = Buffer.from([
	0x00,
	0x00,
	0x00,
	0x0d,
	0x49,
	0x48,
	0x44,
	0x52, // size 13, 'iHDR'
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00,
	0x00, // width (32), height (32)
	0x01,
	0x00,
	0x00,
	0x00,
	0x00, // bit depth, colortype (0 = GRAYSCALE), compression, filter,  interlacing
	0x00,
	0x00,
	0x00,
	0x00,
]); // crc32

const TYPE_IDAT = Buffer.from([0x49, 0x44, 0x41, 0x54]);
const CHUNK_IEND = Buffer.from([
	0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]); // size (32), 'IEND', crc32

const DEBUG = false;

function chunkSize(datasize: number) {
	return datasize + 12;
}

// creates and returns a buffer, input is raw bmp 1 bit
export async function renderPng(bmp: Buffer) {
	const bitsPerPixel = bmp.readUInt16LE(28);
	if (bitsPerPixel != 1) {
		console.warn(`input BMP has ${bitsPerPixel} vs expected 1`);
		return;
	}
	const width = bmp.readInt32LE(18);
	const height = bmp.readInt32LE(22);
	const absHeight = Math.abs(height);
	const bmpRowSize = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
	const pngRowSize = Math.floor((width + 7) / 8);

	const offsetData = bmp.readUInt32LE(10);
	const infoHeaderSize = bmp.readUInt32LE(14);

	if (infoHeaderSize != 40) {
		return;
	}
	const paletteOffset = 14 + infoHeaderSize;
	// white first
	const invert = bmp[paletteOffset] == 0xff;

	// compress first to get final size
	// Create a buffer that is sufficient to hold the compressed png data
	// there is a 1 byte header for each row !
	const pngRawRowSize = pngRowSize + 1;

	const uncompressedBuffer = Buffer.alloc((pngRawRowSize + 1) * absHeight);

	// copy all input and invert at the same time (by row)
	for (let y = 0; y < absHeight; ++y) {
		uncompressedBuffer[y * pngRawRowSize] = 0;
		const bmprow = height < 0 ? y : height - y - 1;
		for (let x = 0; x < pngRowSize; ++x) {
			// white is 0 in bmp
			const b = bmp[offsetData + bmprow * bmpRowSize + x];
			uncompressedBuffer[y * pngRawRowSize + 1 + x] = invert ? ~b : b;
		}
	}

	// should be smaller than input
	deflate(uncompressedBuffer, { level: 9 }, (error, result) => {
		if (error) {
			console.warn(`deflate error ${error}`);
			return;
		}
		// create the PNG in memory
		const iDATChunkDataSize = result.byteLength;
		console.warn(`idat sizer ${iDATChunkDataSize}`);
		const pngSize = 8 + 25 + chunkSize(iDATChunkDataSize) + 12;
		var buf = Buffer.alloc(pngSize);

		//  signature
		PNG_SIGNATURE.copy(buf, 0);

		// iHDR
		CHUNK_iHDR.copy(buf, 8); // 25 bytes
		buf.writeUInt32BE(width, 16); // patch width
		buf.writeUInt32BE(height, 20); // patch height
		const crc = crc32(buf.subarray(12, 29));
		buf.writeUInt32BE(crc, 29);

		let offset = 33;

		// IDAT
		offset = beginWriteChunk(buf, offset, TYPE_IDAT, iDATChunkDataSize);
		result.copy(buf, offset);
		offset = endWriteChunk(buf, offset, iDATChunkDataSize);

		// IEND
		CHUNK_IEND.copy(buf, 8 + 25 + chunkSize(iDATChunkDataSize));

		if (DEBUG) {
			const pngDestination = "/tmp/toto.png";
			fs.writeFile(pngDestination, buf, (err) => {
				if (err)
					console.warn(
						`could no write PNG to ${pngDestination} because of ${err}`,
					);
			});
		}
		return buf;
	});
}

// returns next writing pos
function beginWriteChunk(
	outBuffer: Buffer,
	offset: number,
	chunkType: Buffer,
	chunkSize: number,
) {
	outBuffer.writeUInt32BE(chunkSize, offset + 0);
	chunkType.copy(outBuffer, offset + 4);
	return offset + 8;
}

function endWriteChunk(
	outBuffer: Buffer,
	chunkStartOffset: number,
	chunkSize: number,
) {
	const crc = crc32(
		outBuffer.subarray(chunkStartOffset - 4, chunkStartOffset + chunkSize),
	);
	outBuffer.writeUInt32BE(crc, chunkStartOffset + chunkSize);
	return chunkStartOffset + chunkSize + 4;
}
