# TRMNL Screen Design Guide

This project renders to many e-ink devices. Do not design screens directly
against physical pixels.

## Core Model

Every screen has two sizes:

- **Physical size**: the actual image sent to the device, for example TRMNL X
  renders at `1872x1404`.
- **Logical size**: the design canvas used by recipes, for example TRMNL X is
  `1040x780` with a `1.8` pixel ratio.

Recipes should lay out content with logical dimensions. The renderer scales the
finished logical canvas to physical pixels at the end.

That means TRMNL X benefits from:

- more usable layout space than OG: `1040x780` vs `800x480`.
- sharper text and lines through `1.8x` physical pixels.
- richer grayscale or color palettes.

It should not make every font, icon, margin, and card `1872 / 800 = 2.34x`
bigger.

## React Recipe Rules

Use the `screen` prop when rendering React recipes:

```tsx
Component: ({ width, height, screen, data }) => (
  <MyScreen width={width} height={height} screen={screen} data={data} />
)
```

The `width` and `height` props are logical dimensions. For device-specific
details, use `screen`:

- `screen.logicalWidth`, `screen.logicalHeight`
- `screen.physicalWidth`, `screen.physicalHeight`
- `screen.pixelRatio`
- `screen.sizeTier`
- `screen.orientation`
- `screen.isCompact`, `screen.isHalfScreen`, `screen.isLarge`
- `screen.colors`, `screen.bitDepth`, `screen.supportsColor`

Wrap screens with `PreSatori` using logical dimensions:

```tsx
<PreSatori width={screen.logicalWidth} height={screen.logicalHeight}>
  <ScreenCanvas screen={screen}>...</ScreenCanvas>
</PreSatori>
```

Prefer the shared primitives from `components/trmnl/screen-layout.tsx`:

- `ScreenCanvas`
- `MetricHero`
- `StatsGrid`
- `ScreenFooter`
- `screenMetric`

These primitives scale from the logical canvas, not physical pixels.

Prefer shared primitives over hand-rolled recipe structure. If a screen needs a
canvas, footer, metric hero, or label/value stat card, use the primitive first
and only go custom for charts, coordinate grids, or image-specific layouts.

Primitive internals must use inline renderer-safe styles for core layout,
colors, borders, and typography. Tailwind classes inside custom primitive
components are not reliably preprocessed by `PreSatori`.

Use `ScreenFooter` for bottom metadata bars unless the screen has a strong
reason to omit footer chrome. Footer bars should look consistent across recipes:
rounded gray background, white text, and readable `16`+ logical pixel type.

## LLM Prompt Rules

When asking an LLM to create or edit a screen, include these constraints:

1. Use logical dimensions for layout. Never scale typography from physical
   device pixels.
2. Use `screenMetric(screen, value)` for margins, gaps, borders, and icon sizes.
3. Use `screen.isCompact`, `screen.isHalfScreen`, `screen.isLarge`, and
   `screen.orientation` for layout decisions.
4. Do not introduce raw thresholds like `width >= 1280` unless there is a clear
   device-specific reason.
5. For charts and SVGs, compute explicit logical pixel dimensions, then let the
   renderer scale the whole canvas.
6. Hide lower-priority content on compact layouts. Do not shrink everything until
   it becomes unreadable.
7. Test at least these profiles:
   - OG landscape: `800x480`
   - OG portrait: `480x800`
   - half screen: `400x480`
   - TRMNL X landscape: `1872x1404` physical, `1040x780` logical

## Content Hierarchy

Design by priority:

1. Primary information: the thing the user checks at a glance.
2. Secondary context: chart, trend, label, or supporting value.
3. Tertiary detail: extra stats, metadata, timestamps.
4. Chrome: borders, decorations, labels.

On compact screens, drop level 3 before shrinking level 1.

## E-Ink Constraints

- Use high contrast first. Subtle gray decoration often disappears on 1-bit
  devices.
- Avoid thin lines below `2` logical pixels for important structure.
- Keep meaningful text at `14` logical pixels or larger. Prefer `16`+ for
  metadata, footers, chart axes, and stat/card labels like `Market Cap` or
  `24h Volume`; stat/card labels should generally be `18`+. Use
  `screenFontSize(screen, value)` for computed font sizes.
- Avoid tiny all-caps labels unless they are decorative and not needed to
  understand the value.
- Use fewer, stronger regions. Dense web dashboards usually render poorly.
- Always check the bitmap preview, not only the React preview.
