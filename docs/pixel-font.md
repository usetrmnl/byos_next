Dynamic Pixel Font Format

This document defines the new dynamic bitmap/pixel font format.

The goal is to store pixel fonts in a way that is:

* baseline-relative
* dynamically sized per glyph
* compatible with proportional fonts
* easy to render in paragraphs
* easy to convert into packed binary bitmaps later
* explicit about vertical metrics such as baseline, x-height, cap height, ascenders, descenders, and overhangs

This format is not SVG-like. It stores actual painted pixels, not vector paths.

⸻

1. Core idea

Every glyph is drawn inside a shared font coordinate system.

The baseline is always y = 0.

Rows above the baseline use positive Y values.

Rows below the baseline use negative Y values.

y = maxY          highest possible painted row
y = capHeightY    normal capital height
y = xHeightY      normal lowercase height
y = 0             baseline
y = descenderY    normal descender depth
y = minY          lowest possible painted row

Example:

metrics: {
  minY: -6,
  descenderY: -4,
  baselineY: 0,
  xHeightY: 14,
  capHeightY: 19,
  maxY: 26
}

This means:

highest row: +26
cap height:  +19
x-height:    +14
baseline:      0
descender:    -4
lowest row:   -6

Total font grid height:

height = maxY - minY

For the example:

26 - (-6) = 32

Use this as the vertical space available for the full font.

⸻

2. Why baseline-relative Y coordinates?

Do not store glyphs as top-left cell coordinates.

Old bitmap formats often use:

row 0 = top of cell
row 22 = bottom of cell

That works for a fixed editor grid, but it is awkward for real text layout.

Instead, this format uses typographic coordinates:

baseline = 0
above baseline = positive
below baseline = negative

This makes paragraph rendering easier because every line can be positioned by its baseline.

Example:

glyphPixelYOnCanvas = lineBaselineY - glyphY

or, if your canvas coordinate system has positive Y upwards:

glyphPixelYOnCanvas = lineBaselineY + glyphY

Choose one convention inside the renderer and keep it consistent.

For normal HTML canvas, where Y increases downward, use:

screenY = baselineScreenY - fontY

⸻

3. Font-level metrics

The font-level metrics define the shared vertical coordinate system.

type PixelFontMetrics = {
  minY: number
  descenderY: number
  baselineY: 0
  xHeightY: number
  capHeightY: number
  maxY: number
  lineGap?: number
  pixelUnitX?: number
  pixelUnitY?: number
  dynamicWidth: boolean
}

Meaning

Field	Meaning
minY	Lowest possible painted pixel row in the whole font
descenderY	Normal descender line, e.g. bottom of g, p, q, y
baselineY	Always 0
xHeightY	Height of lowercase letters such as x, a, e, n
capHeightY	Height of capital letters such as H, I, W
maxY	Highest possible painted pixel row, including accents
lineGap	Extra vertical space between lines
pixelUnitX	Width of one pixel unit in render output
pixelUnitY	Height of one pixel unit in render output
dynamicWidth	Whether glyphs have individual widths and advances

Notes

capHeightY is not necessarily the highest row.

Accented capitals such as Ŵ, Â, Ä, É, or Å may rise above cap height.

Likewise, descenderY is not necessarily the lowest row.

Characters such as Ų, Ç, Ę, or custom marks may go below the normal descender line.

So:

maxY >= capHeightY
minY <= descenderY

⸻

4. Glyph structure

Each glyph stores its own metrics and painted rows.

type Glyph = {
  charCode: number
  char: string
  width: number
  advance: number
  leftBearing: number
  bounds: GlyphBounds
  rows: GlyphRow[]
}
type GlyphBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}
type GlyphRow = {
  y: number
  runs: GlyphRun[]
}
type GlyphRun = [startX: number, endX: number]

endX is exclusive.

So:

[2, 6]

means:

paint x = 2, 3, 4, 5

It does not include x = 6.

⸻

5. Row-run encoding

Glyph pixels are stored as horizontal runs grouped by Y row.

Example visual row:

AAIIIIAA

Where:

A = empty
I = filled

Becomes:

{ y: 10, runs: [[2, 6]] }

Another row:

IIAAIIAA

Becomes:

{ y: 10, runs: [[0, 2], [4, 6]] }

Empty rows are omitted.

This keeps the format compact while remaining easy to inspect and edit.

⸻

6. Why row-runs instead of raw binary?

A packed bitmap is good for final rendering, but bad as the canonical editable format.

A packed bitmap forces every glyph into:

width * height

That becomes awkward when:

* glyph widths are dynamic
* some glyphs have accents
* some glyphs have descenders
* the editor needs readable diffs
* the renderer needs baseline alignment
* agents need to reason about glyph shape

Row-runs are the preferred canonical format.

Packed bitmaps can be generated as a render cache.

Recommended architecture:

source format:   row-runs
render cache:    packed bitmap / Uint8Array / Uint32Array
runtime output:  canvas / image / DOM / one-bit display buffer

⸻

7. Rendering algorithm

To render a glyph on a normal screen or canvas where Y increases downward:

function renderGlyph(
  glyph: Glyph,
  baselineScreenX: number,
  baselineScreenY: number,
  drawPixel: (x: number, y: number) => void
) {
  for (const row of glyph.rows) {
    const screenY = baselineScreenY - row.y
    for (const [startX, endX] of row.runs) {
      for (let x = startX; x < endX; x++) {
        drawPixel(baselineScreenX + glyph.leftBearing + x, screenY)
      }
    }
  }
}

Then advance the pen:

penX += glyph.advance

For proportional fonts, each glyph may have a different advance.

⸻

8. Paragraph rendering

Paragraph layout should be based on baselines, not glyph boxes.

Basic line height:

lineHeight = (metrics.maxY - metrics.minY) + metrics.lineGap

For each line:

lineBaselineY = firstBaselineY + lineIndex * lineHeight

Then render each glyph relative to that baseline.

This ensures accents, descenders, and overhangs do not change line positioning.

⸻

9. Bounds

Each glyph has a bounds object calculated from actual painted pixels.

bounds: {
  minX: 0,
  maxX: 7,
  minY: -2,
  maxY: 19
}

Bounds are useful for:

* hit testing
* trimming
* visual previews
* exporting
* collision checks
* debugging
* optional tight rendering

But line layout should still use font-level metrics, not individual glyph bounds.

Empty glyphs

For a glyph with no painted pixels, such as a space:

bounds: {
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0
}

The glyph should still have an advance.

⸻

10. Migration from old cell format

Old format:

type OldGlyph = {
  charCode: number
  char: string
  data: string
  width: number
  advance: number
}

Old cell metrics:

type OldMetrics = {
  cellHeight: number
  capTop: number
  baselineRow: number
  descenderDepth: number
  xHeight: number
}

Old data is read from top to bottom:

oldRow = 0             top of cell
oldRow = baselineRow   baseline

Convert old row to new Y:

y = baselineRow - oldRow

Given:

cellHeight = 23
capTop = 2
baselineRow = 15
descenderDepth = 4
xHeight = 10

Derive:

baselineY = 0
capHeightY = baselineRow - capTop
xHeightY = xHeight
descenderY = -descenderDepth
maxY = baselineRow
minY = baselineRow - (cellHeight - 1)

Example:

capHeightY = 15 - 2 = 13
xHeightY = 10
descenderY = -4
maxY = 15
minY = -7

⸻

11. Old pixel decoding

The old data string uses character symbols for pixels.

For migration:

A = empty pixel
anything else = filled pixel

So:

const filled = pixel !== "A"

Split data into rows using the glyph width:

const rows = []
for (let oldRow = 0; oldRow < cellHeight; oldRow++) {
  const start = oldRow * glyph.width
  const end = start + glyph.width
  const row = glyph.data.slice(start, end)
}

Then convert each row into runs.

⸻

12. Example converted glyph

{
  charCode: 33,
  char: "!",
  width: 6,
  advance: 6,
  leftBearing: 0,
  bounds: {
    minX: 2,
    maxX: 4,
    minY: 0,
    maxY: 13
  },
  rows: [
    { y: 13, runs: [[2, 4]] },
    { y: 12, runs: [[2, 4]] },
    { y: 11, runs: [[2, 4]] },
    { y: 10, runs: [[2, 4]] },
    { y: 9, runs: [[2, 4]] },
    { y: 8, runs: [[2, 4]] },
    { y: 7, runs: [[2, 4]] },
    { y: 6, runs: [[2, 4]] },
    { y: 2, runs: [[2, 4]] },
    { y: 1, runs: [[2, 4]] }
  ]
}

Exact rows depend on the original glyph data.

⸻

13. Recommended JSON shape

type PixelFontFile = {
  metadata: {
    name: string
    creator?: string
    createdAt?: string
    version: string
    description?: string
    metrics: PixelFontMetrics
  }
  glyphs: Record<string, Glyph>
}

Recommended key:

glyphs[char]

Example:

glyphs: {
  "A": { ... },
  "B": { ... },
  "!": { ... }
}

Fallback key:

glyphs[String(charCode)]

Use char-code keys if duplicate glyph labels, escaping, or composed Unicode forms become a problem.

⸻

14. Unicode and composed characters

Prefer storing both:

char: "Ŵ"
charCode: 372

For simple BMP characters, charCode is usually enough.

For characters outside the BMP, use code point logic instead of UTF-16 charCodeAt(0).

Recommended future-safe form:

codePoint: number

For now, preserve existing charCode if that is how the current API works.

⸻

15. Important invariants

A valid font should satisfy:

metrics.baselineY === 0
metrics.maxY >= metrics.capHeightY
metrics.capHeightY >= metrics.xHeightY
metrics.xHeightY >= 0
metrics.descenderY <= 0
metrics.minY <= metrics.descenderY

Each glyph should satisfy:

glyph.width >= 0
glyph.advance >= 0
glyph.bounds.minX <= glyph.bounds.maxX
glyph.bounds.minY <= glyph.bounds.maxY

Each row should satisfy:

row.y >= metrics.minY
row.y <= metrics.maxY

Each run should satisfy:

startX < endX
startX >= 0
endX <= glyph.width

Rows should ideally be sorted from highest Y to lowest Y:

rows.sort((a, b) => b.y - a.y)

Runs should be sorted left to right:

runs.sort((a, b) => a[0] - b[0])

⸻

16. Mental model for agents

When working with this format, think like this:

The font defines the vertical world.
The baseline is the origin.
Each glyph defines where its pixels exist inside that world.
Rows say which horizontal pixels are painted at a given Y.
Paragraphs move by baseline and advance, not by glyph bounding boxes.

Do not infer vertical placement from array index after conversion.

Always use explicit y.

Do not render from top-left unless converting to a specific raster buffer.

Do not use SVG path rasterisation rules.

The glyph data is already rasterised.