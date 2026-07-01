# TRMNL e-ink palette mapping

`data/trmnl/palettes.json` is the single source of truth for device color
capabilities. TRMNL device models reference a palette id; screen generation
uses `resolveDeviceRenderTarget(palette)` to pick gray-level, discrete-color,
or channel-depth reduction.

| TRMNL device family (typical) | `color_depth` / colors | Palette id |
|------------------------------|------------------------|------------|
| OG TRMNL, most 1-bit panels | 1-bit mono | `bw` |
| Xteink X4, older Kindle 4-gray | 2-bit / 4 grays | `gray-4` |
| Carta 16-gray | 4-bit / 16 grays | `gray-16` |
| Kindle Paperwhite 256-gray | 8-bit / 256 grays | `gray-256` |
| Waveshare 3-color BWR | 3 colors | `color-3bwr` |
| Waveshare 3-color BWY | 3 colors | `color-3bwy` |
| 4-color BWRY | 4 colors | `color-4bwry` |
| Spectra 6 (E6) | 6 colors | `color-6a` |
| ACeP / Gallery 7-color | 7 colors | `color-7a` |
| Kaleido / full-color mirror | 12-bit RGB444 | `color-12bit` |
| LCD / true color | 24-bit | `color-24bit` |

Image dithering routes per target:

- **Grayscale palettes** — Bayer / white-noise / FS to N levels (Lab L\*).
- **Discrete color palettes** — Bayer / FS / snap to palette RGB list.
- **12/24-bit** — per-channel quantize (`quantizePngChannels`).

UI fills on 1-bit screens should use Tailwind `dither-*` patterns (see
`responsive-example`) instead of solid Tailwind colors; color screens keep
solid fills.
