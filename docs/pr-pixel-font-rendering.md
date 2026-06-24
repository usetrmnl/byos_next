# PR: Pixel font rendering improvements

> Living notes for branch `feat/pixel-font-rendering`. Update this file as work lands so the final PR description is easy to write.

**Branch:** `feat/pixel-font-rendering` (renamed from `feat/pixel-font-sources`)

**Base:** `main`

**Status:** In progress — uncommitted WIP on v2 format, metrics derivation, Geist Pixel Grid, and designer tooling.

---

## Summary (draft — fill in at PR time)

Improve bitmap/pixel font rendering end-to-end: new baseline-relative v2 font format, traced font packs from web fonts, layout/metrics pipeline, runtime `BitmapText` rendering, font designer tooling, and generation scripts.

---

## Committed on branch

### `f04de29` — Enhance error handling and update README for local setup

- Add `formatErrorMessage` utility for consistent error strings across the app.
- Wire `executeSqlStatements` and database utils to use it.
- README updates for local dev setup (DB config, first-run steps).

### `23c5e40` — feat: enhance font generation and update device handling

- Bitmap font generation pipeline: trace web fonts → v2 JSON → legacy packs.
- New scripts: `generate-bitmap-fonts.mjs`, `convert-bitmap-font.mjs`, trace/benchmark helpers.
- Font source registry (`lib/font-sources.json`, `lib/font-sources.ts`).
- Generated packs: Block Kie, Geist Pixel Square, Geneva.
- `BitmapText` component and layout libs (`layout.ts`, `layout-v2.ts`, `pack-utils.ts`, etc.).
- API route `app/api/bitmap-fonts/[packId]/route.ts` for pack delivery.
- Bitmap font designer UI updates.
- Geist Pixel Square woff2 in `public/fonts/`.
- CSS font-face entries in `globals.css`.
- Incidental: sign-in password visibility, sidebar tweaks, device/setup handling, simple-text recipe screen.

### `873e693` — fix: recognize TRMNL devices by MAC during setup

- Device setup recognizes TRMNL hardware by MAC address.

---

## WIP (uncommitted)

Track these until committed; move bullets into **Committed** when done.

### v2 format & typographic metrics

- [ ] `docs/pixel-font.md` — spec for baseline-relative dynamic pixel font format.
- [ ] `lib/bitmap-font/metrics-derive.ts` + `scripts/lib/metrics-derive.mjs` — derive cap height, x-height, descender lines from traced glyph ink.
- [ ] `layout-v2.ts` — layout using v2 metrics and per-glyph bounds.
- [ ] `convert-v2-to-legacy.ts` / `convert-legacy-font.ts` — round-trip and legacy pack emission updates.
- [ ] `decode-cell-data.ts` — cell decode tweaks for new coordinate model.

### New font: Geist Pixel Grid

- [ ] `public/fonts/GeistPixel-Grid.woff2`
- [ ] `components/bitmap-font/generated/geist-pixel-grid.json`
- [ ] `lib/font-sources.json` entry + trace/discover script updates.

### Generation & audit tooling

- [ ] `scripts/audit-font-metrics.mjs` — metrics consistency checks.
- [ ] `scripts/benchmark-font-glyphs.mjs` + `font-glyph-benchmark.html` + fixtures.
- [ ] `scripts/migrate-ft-dynamic.mjs` — migration helper for dynamic format.
- [ ] Trace pipeline updates (`trace-core.mjs`, `trace-glyph-node.mjs`, `discover-pixel-grid.mjs`).

### Designer & runtime

- [ ] Bitmap font designer client/editor/utils — v2 editing, metrics preview.
- [ ] `bitmap-text.tsx` — minor rendering fix.
- [ ] Regenerated pack JSON (block-kie, geist-pixel-square, geneva) with new metrics/layout.

### Other

- [ ] `data/trmnl/models.json`, `data/trmnl/palettes.json` — device data updates (if kept in this PR).
- [ ] `AGENTS.md` — Next.js agents index (consider excluding from PR).

---

## Key files / areas

| Area | Paths |
|------|-------|
| Format spec | `docs/pixel-font.md` |
| Runtime layout | `lib/bitmap-font/layout-v2.ts`, `layout.ts`, `index.ts` |
| Metrics | `lib/bitmap-font/metrics-derive.ts` |
| Packs | `lib/bitmap-font/packs.ts`, `components/bitmap-font/generated/*.json` |
| Rendering | `components/bitmap-font/bitmap-text.tsx` |
| Designer | `app/(app)/tools/.../bitmap-font-designer/` |
| Generation | `scripts/generate-bitmap-fonts.mjs`, `scripts/lib/*` |
| Font sources | `lib/font-sources.json`, `lib/font-sources.ts` |

---

## Test plan (draft)

- [ ] `pnpm run lint` / `pnpm test` (if applicable)
- [ ] Regenerate fonts: `pnpm run generate:fonts`
- [ ] Bitmap font designer: create/edit glyph, export pack, preview paragraph layout
- [ ] `BitmapText` on simple-text recipe / device preview — baseline alignment, mixed ascenders/descenders
- [ ] Legacy pack conversion still loads existing screens
- [ ] Geist Pixel Grid pack traces and renders correctly
- [ ] Device setup MAC recognition (already committed)

---

## PR description template

Copy and trim when opening the PR:

```markdown
## Summary

- Introduce baseline-relative v2 pixel font format with typographic metrics (baseline, cap height, x-height, descenders).
- Add font tracing pipeline from web fonts → v2 JSON → legacy bitmap packs (Geist Pixel Square/Grid, Geneva, Block Kie).
- Improve `BitmapText` layout and bitmap font designer for proportional, paragraph-friendly rendering.
- …

## Test plan

- [ ] …
```

---

## Changelog (append as you go)

| Date | Note |
|------|------|
| 2026-06-24 | Branch renamed `feat/pixel-font-sources` → `feat/pixel-font-rendering`. PR notes file created. |
| 2026-06-24 | WIP: v2 metrics derivation, Geist Pixel Grid, designer updates, regenerated packs. |
