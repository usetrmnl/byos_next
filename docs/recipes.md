# Recipe Collection

The recipes page lets you visualize and test components in both direct React
rendering and device-image rendering forms. It is designed for developing and
testing components that will run on e-ink displays.

## How It Works

The recipes page provides two main views:

1. **Index view** (`/recipes`) — every recipe grouped by category.
2. **Recipe view** (`/recipes/[slug]`) — a single recipe with React and
   device-image renderings side by side.

Built-in React recipes live in `app/(app)/recipes/screens/<slug>/`. Each
folder is a single source of truth: the component, its Zod schemas, and
its `RecipeDefinition` export all live in one file. There is no
separate registry file to keep in sync.

## Adding a New Recipe

1. Create a folder named after your recipe's slug under
   `app/(app)/recipes/screens/`. Add `<slug>.tsx`.

2. Inside `<slug>.tsx`, declare two Zod schemas and a `definition` export:

```tsx
import { z } from "zod";
import type { RecipeDefinition } from "@/lib/recipes/types";
import {
  createScreenProfile,
  type ScreenProfile,
} from "@/lib/trmnl/screen-profile";
import { PreSatori } from "@/utils/pre-satori";

export const paramsSchema = z.object({
  message: z
    .string()
    .default("Hello world")
    .describe("Text to render on the screen")
    .meta({ title: "Message" }),
});
export const dataSchema = paramsSchema;

export default function MyRecipe({
  width,
  height,
  screen,
  data,
}: {
  width?: number;
  height?: number;
  screen?: ScreenProfile;
  data: z.infer<typeof dataSchema>;
}) {
  const screenProfile = screen ?? createScreenProfile({
    width: width ?? 800,
    height: height ?? 480,
  });
  return (
    <PreSatori
      width={screenProfile.logicalWidth}
      height={screenProfile.logicalHeight}
    >
      <div className="flex h-full w-full items-center justify-center text-4xl">
        {data.message}
      </div>
    </PreSatori>
  );
}

export const definition: RecipeDefinition<typeof paramsSchema> = {
  meta: {
    slug: "my-recipe",
    title: "My Recipe",
    description: "A demo recipe",
    published: true,
    tags: ["demo"],
    category: "display-components",
    version: "0.1.0",
  },
  paramsSchema,
  dataSchema,
  Component: ({ width, height, screen, data }) => (
    <MyRecipe width={width} height={height} screen={screen} data={data} />
  ),
};
```

3. The recipe index regenerates automatically on `pnpm dev` and
   `pnpm build`. To regenerate by hand, run `pnpm generate:recipes`.

That's it. The recipe shows up in the sidebar, has a working parameter
form (rendered from `paramsSchema`), and renders through the shared
device-image pipeline. No `screens.json` to edit.

## Fetching Data

If a recipe needs to fetch data at render time, add a `getData` function
to its `definition`:

```tsx
export const dataSchema = z.object({
  title: z.string().default("Loading…"),
  body: z.string().default("…"),
});

async function fetchPost(params: z.infer<typeof paramsSchema>) {
  const res = await fetch(`https://api.example.com/post/${params.id}`);
  return res.json();
}

export const definition: RecipeDefinition<
  typeof paramsSchema,
  typeof dataSchema
> = {
  meta: { /* … */ },
  paramsSchema,
  dataSchema,
  getData: async (params) => {
    const data = await fetchPost(params);
    return data as z.infer<typeof dataSchema>;
  },
  Component: ({ width, height, data }) => (
    <MyRecipe width={width} height={height} data={data} />
  ),
};
```

The runtime calls `getData(params)` with the user's saved overrides
(validated against `paramsSchema`), parses the result against
`dataSchema` (with defaults applied for missing fields), and passes the
final shape to `Component` as `data`.

For complex data fetchers, keep them in a sibling `getData.ts` file and
import the function into your `definition`.

## Device Image Rendering

The recipe runtime renders each React component into the selected device's image
format through this pipeline:

1. The component renders to PNG via the configured renderer
   (`takumi`, `satori`, or `browser`).
2. `renderDeviceImage` resizes/rotates the PNG, reduces it to the selected
   palette or channel depth, and encodes it using the model's `mime_type`.
3. The image is served by `/api/bitmap/<slug>.<ext>`, where `<ext>` comes from
   the selected model.

Set `REACT_RENDERER=takumi|satori|browser` to switch renderers.

### Image Dithering

The final device pass hard-snaps the full frame to the selected palette or
channel depth. It does not run Floyd-Steinberg over the whole screen, so text,
icons, and flat fills stay crisp.

Image-only preparation is enabled by default when the request includes a device
profile with a reducible palette or channel depth. Opt out per recipe with:

```ts
renderSettings: {
  imageDither: false,
}
```

`imageDither: "floyd-steinberg"` is still accepted for explicitness. When active,
the renderer rewrites plain `<img src="...">` and simple `<source srcSet="...">`
image URLs to prepared PNG data URLs before the recipe is composed into the
unified PNG. Existing `data:` URLs and CSS `background-image` values are not
rewritten.

## Responsive Design

Recipes are rendered at fixed physical dimensions, but React recipe
components receive logical dimensions for layout. For example, TRMNL X is
rendered at `1872x1404` physical pixels but recipes lay out against its
`1040x780` logical canvas.

Use the `screen` prop and the shared primitives in
`components/trmnl/screen-layout.tsx` for responsive layout decisions.
Avoid scaling typography and spacing directly from physical width.
See `docs/trmnl-screen-design.md` for the full screen design model and
LLM authoring rules.

Special dither classes (`dither-100`, etc.) work with Satori for
gradients on 1-bit displays.

## Routing

- `/recipes` — index view
- `/recipes/[slug]` — single recipe view

`generateStaticParams` enumerates the recipe registry so every recipe
page is pre-rendered at build time.
