# PR coordination drafts — review before posting

**Status:** Posted 2026-06-29.

- [#78 comment](https://github.com/usetrmnl/byos_next/pull/78#issuecomment-4836542671)
- [#80 comment](https://github.com/usetrmnl/byos_next/pull/80#issuecomment-4836543001)

---

## Post on PR #78

```markdown
### Palette / quantization — current model + way forward

Cross-ref: scope split and #80 follow-up in [#80](https://github.com/usetrmnl/byos_next/pull/80#issuecomment-4834804886).

#### Problem 1 — "how many gray levels" has three independent definitions

A device's gray-level count (BW=2, gray-4=4, gray-16=16) is the same fact whether we're encoding a BMP, building an error image, or quantizing a device PNG. Today it's defined in three places that can drift independently:

- the BMP / error-image path reads a **hardcoded `id → levels` map** (`getBmpGrayLevelsForPalette(palette.id)` in `palette-gray-levels.ts`);
- the device-PNG path reads **`palette.grays` inline** (`device-image.ts`), but only on the branch where `resolvePaletteColors` returns `null`;
- `palettes.json` already carries the authoritative `grays` per palette — the same numbers the map restates.

Adding a new grayscale palette today requires updating the map, the inline branch, and JSON independently. There is no shared `getPaletteGrayLevels(palette)`, so `palettes.json` is not the single source of truth in practice.

**Fix:** one resolver — `getPaletteGrayLevels(palette)` in `palette-colors.ts`, reading `palettes.json.grays`. BMP path calls it (falling back to 2 for color palettes); device path calls it. The map and the inline read both disappear.

#### Problem 2 — the grayscale posterize path never runs

For `bw` / `gray-4` / `gray-16`, `resolvePaletteColors` returns a discrete gray RGB list, so `paletteGrays` is always `null` and every grayscale device falls through to `quantizeToPalette` — never `quantizeToGrayLevels`. The posterize branch described in the comment block is unreachable for standard grayscale palettes.

The consequence is Problem 3.

#### Problem 3 — Floyd–Steinberg runs on the entire frame, not just images

`quantizeToPalette` unconditionally applies **Floyd–Steinberg (FS) error diffusion**: each pixel is snapped to the nearest palette entry and its quantization error is pushed into the not-yet-processed neighbors. Two properties matter here:

- **It's non-local.** The value written for a pixel depends on every pixel before it in scan order, so the whole frame is one serial dependency chain — the most CPU-heavy option, paid on every device render at request time.
- **It's applied to everything.** Text, SVG-style icons, flat color fills, and Tailwind `dither-*` blocks all go through it, not just `<img>` content.

For UI, that's actively wrong, not just slow. Concrete cases on current recipes:

- **`responsive-example`** — solid blue/red/green/purple panels become speckled gray instead of four uniform tones. The output looks broken, not dithered.
- **Any text-forward recipe** (`simple-text`, `weather`, `bitcoin-price`) — glyph and icon edges pick up error-diffusion noise from neighboring pixels, so type that is crisp in the Takumi PNG arrives soft on device.

#### Already correct in #78

Dropping the independent `Device.grayscale` knob, TRMNL X PNG palette encoding for the size budget, and the device-preview / log / registry refactor are all good foundation and unaffected by the above.

#### Way forward (for #78)

1. **One resolver** — `getPaletteGrayLevels(palette)` in `palette-colors.ts`; remove the hardcoded map and the inline read (Problem 1).
2. **Route grayscale to a level-snap path** — `bw`/`gray-4`/`gray-16` hard-quantize to their palette level count; reserve `quantizeToPalette` for discrete *color* palettes (Problem 2).
3. **Default = hard quantize, no FS** — the Takumi PNG stays full-color and browser-faithful; the device step nearest-snaps each pixel to the palette independently. Levels still follow palette bit depth, the same contract as Framework `image-dither`, but without diffusing error across the frame (Problem 3).
4. **Scope #78 to foundation** — palette model, routing fix, hard-quantize default, device profiles, preview/log. No global FS.

**Why hard quantize is the right default now:** BYOS targets many models, palettes, and bit depths (1-bit BW through 16-level gray and color). The shared payload across all of them is text, layout, and icons — not photos. Those must stay sharp and read identically in intent on every screen. A per-pixel nearest-level snap is local, content-independent in cost, and preserves crisp type and uniform fills. If a richer dither is ever wanted for UI, **Bayer** (fixed threshold-matrix lookup) and **threshold quantize** (per-pixel: luminance ≥ 50% → high level, &lt; 50% → low level) are both local and cheap — same cost regardless of frame content, predictable across devices — and are the right tools, not FS.

**Images are the author's call, not the renderer's.** Photographic / continuous-tone content is the only place dither helps, and the author knows their content. So for images specifically, give them two routes (both in [#80](https://github.com/usetrmnl/byos_next/pull/80)): render the image themselves and pre-quantize per device (conditional classes / per-device assets), or opt into a server helper (`prepareForDevice`, Bayer / white-noise / threshold) that dithers on their behalf. Either way it's scoped to the image, not a blanket FS pass on every recipe.
```

---

## Post on PR #80 (reply to rbouteiller's alignment comment)

```markdown
Aligned on palette SSOT and `getPaletteGrayLevels` — see implementation notes in [#78](https://github.com/usetrmnl/byos_next/pull/78#issuecomment-4836542671) (routing, FS vs hard quantize).

**Scope split:**

**#78 — foundation**
- Remove `Device.grayscale`; palette drives levels
- `getPaletteGrayLevels(palette)` from `palettes.json`; fix grayscale routing
- Default device quantizer: **hard quantize** to palette (no Floyd–Steinberg on full frame)
- Device model, preview, log rendering, registry validation, TRMNL X image-size budget

**#80 — this PR (rebase after #78)**
- Bitmap / pixel font system (v2, `BitmapText`, designer, curated packs)
- Remove 2× supersampling + downscale pipeline
- Font script dedup, curation docs, review fixes (already pushed)

**#80 — image dither (opt-in only, not global FS)**
Multi-screen / multi-palette support means the default path must prioritize **text and SVG icon sharpness** over tonal smoothing. FS on the whole frame works against that.

For **embedded photos only**, authors choose:
- pre-render / swap assets per device (conditional classes, separate files), or
- opt-in server dither via `prepareForDevice` (Bayer or white-noise — local, CPU-friendly; threshold quantize for 1-bit) — not Floyd–Steinberg on the full Takumi output.

No duplicate palette commits from our side on #78. Rebase here after #78 merges; drop anything already landed in main.
```

---

## gh commands (run only after user approval)

Replace `PLACEHOLDER` in #80 draft with the actual #78 comment node ID after posting #78 first, or use a PR link without anchor for first post.

```bash
# Post #78 first
gh pr comment 78 --body "$(python3 - <<'PY'
import re
text = open("docs/pr-78-80-coordination-drafts.md").read()
m = re.search(r"## Post on PR #78\n\n```markdown\n(.*?)```", text, re.S)
print(m.group(1).strip())
PY
)"

# Then post #80 (update #78 link anchor if needed)
gh pr comment 80 --body "$(python3 - <<'PY'
import re
text = open("docs/pr-78-80-coordination-drafts.md").read()
m = re.search(r"## Post on PR #80.*?\n\n```markdown\n(.*?)```", text, re.S)
print(m.group(1).strip())
PY
)"
```

**Post order:** #78 first, then #80 — so #80 can link to the live #78 comment URL.

---

## Post-merge inventory (2026-07-01, after #78 merged as `322c745`)

Machine-readable lists saved at `/tmp/pr80-unique.diffstat` and `/tmp/pr80-commits.txt` (13 commits, 109 files, ~70k insertions).

### Landed on main (#78) — drop from #80 on rebase

| Area | Main path | Action on rebase |
|------|-----------|------------------|
| Palette SSOT | `getPaletteGrayLevels`, `resolveDeviceRenderTarget` in `palette-colors.ts`; `palette-gray-levels.ts` removed | Drop #80 duplicate |
| Device quantizer | `device-image.ts` + `palette-reduction.ts` (snap default, no frame FS) | Take main; drop #80 inline Lab quantizer |
| BMP encoding | `bmp-encoder.ts`, `quantize.ts` | Take main structure |
| Image intercept | `image-dither-intercept.ts`, `image-dither-policy.ts`, `device-image-prep.ts` (FS default) | Merge into unified surface (Bayer default) |
| Device model | `Device.grayscale` removed, registry validation | Take main |
| 2× supersample | `settings.ts`, `getRenderScale`, `types.supersample` | Re-delete (main reintroduced) |

### #80 unique — keep

| Area | Path | Notes |
|------|------|-------|
| Bitmap fonts | `lib/bitmap-font/*`, `components/bitmap-font/*`, designer UI | Core PR value |
| 1× rasterize | `rasterize.ts` (no scaleFactor) | Re-delete supersample after rebase |
| Image algorithms | `dither-image.ts`, `utils/image-processing.ts` | Bayer/white-noise/FS; default → Bayer |
| Recipe hook | `prepareForDevice`, `RecipeDeviceContext` | album, wikipedia |
| Font curation | `docs/pixel-font.md`, script dedup, node-ts hooks | Review fixes |
| BitmapText recipes | simple-text, weather, bitcoin-price, calendar, bitmap-patterns, album | Font integration |

### Neither branch yet — #80 follow-up commits

- Unified device-aware image surface (merge FS routing + Bayer algorithms)
- Color Bayer path in `palette-reduction.ts`
- Lab L* luminance for gray reduction
- `responsive-example` 1-bit authoring fix
- e-ink spec mapping documentation
