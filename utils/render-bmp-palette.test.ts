import assert from "node:assert/strict";
import test from "node:test";

const loadPaletteModule = async () =>
	import(new URL("./render-bmp-palette.ts", import.meta.url).href).catch(
		() => null,
	);

test("createGrayscalePaletteEntries orders monochrome colors from black to white", async () => {
	const paletteModule = await loadPaletteModule();

	assert.ok(paletteModule, "render-bmp-palette module should exist");
	assert.deepEqual(
		paletteModule.createGrayscalePaletteEntries(2),
		[0x00000000, 0x00ffffff],
	);
});

test("mapGrayscaleValueToPaletteIndex maps darker values to lower palette indexes", async () => {
	const paletteModule = await loadPaletteModule();

	assert.ok(paletteModule, "render-bmp-palette module should exist");
	assert.equal(paletteModule.mapGrayscaleValueToPaletteIndex(0, 2), 0);
	assert.equal(paletteModule.mapGrayscaleValueToPaletteIndex(255, 2), 1);
	assert.equal(paletteModule.mapGrayscaleValueToPaletteIndex(0, 4), 0);
	assert.equal(paletteModule.mapGrayscaleValueToPaletteIndex(255, 4), 3);
});

test("shouldSetMonochromeBit only sets bits for white pixels", async () => {
	const paletteModule = await loadPaletteModule();

	assert.ok(paletteModule, "render-bmp-palette module should exist");
	assert.equal(paletteModule.shouldSetMonochromeBit(0, 2), false);
	assert.equal(paletteModule.shouldSetMonochromeBit(1, 2), true);
});
