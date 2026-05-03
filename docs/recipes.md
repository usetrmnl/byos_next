# Recipe Collection

The recipes page lets you visualize and test components in both direct
rendering and bitmap (BMP) rendering forms. It is designed for developing
and testing components that will run on e-ink displays.

## How It Works

The recipes page provides two main views:

1. **Index view** (`/recipes`) — every recipe grouped by category.
2. **Recipe view** (`/recipes/[slug]`) — a single recipe with React,
   PNG, and BMP renderings side by side.

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
  data,
}: {
  width?: number;
  height?: number;
  data: z.infer<typeof dataSchema>;
}) {
  return (
    <PreSatori width={width} height={height}>
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
  Component: ({ width, height, data }) => (
    <MyRecipe width={width} height={height} data={data} />
  ),
};
```

3. The recipe index regenerates automatically on `pnpm dev` and
   `pnpm build`. To regenerate by hand, run `pnpm generate:recipes`.

That's it. The recipe shows up in the sidebar, has a working parameter
form (rendered from `paramsSchema`), and renders to BMP/PNG via the
shared rasterizer. No `screens.json` to edit.

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

## Bitmap Rendering

The recipe runtime turns each React component into a 1-bit (or 4/16
shade) BMP through this pipeline:

1. The component renders to PNG via the configured renderer
   (`takumi`, `satori`, or `browser`).
2. `utils/render-bmp.ts` converts the PNG into a BMP suitable for the
   target TRMNL device, applying Floyd–Steinberg dithering.
3. The BMP is served by `/api/bitmap/<slug>.bmp`.

Set `REACT_RENDERER=takumi|satori|browser` to switch renderers.

## Responsive Design

Recipes are rendered at fixed pixel dimensions. Use Tailwind's responsive
classes (`sm:`, `md:`, `lg:`, …) to adapt layouts to portrait vs
landscape orientations. The recipe preview lets you switch orientations
at runtime via `?format=portrait`.

Special dither classes (`dither-100`, etc.) work with Satori for
gradients on 1-bit displays.

## Routing

- `/recipes` — index view
- `/recipes/[slug]` — single recipe view

`generateStaticParams` enumerates the recipe registry so every recipe
page is pre-rendered at build time.
