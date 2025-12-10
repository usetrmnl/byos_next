# Recipe Collection

This recipes page allows you to visualize and test components in both their direct rendering and bitmap (BMP) rendering forms. It's designed to help develop and test components for e-ink displays.

## How It Works

The recipes page provides two main views:

1. **Index View** (`/recipes`) - Shows a list of all available recipes grouped by category
2. **Recipe View** (`/recipes/[slug]`) - Shows a specific recipe with both direct and BMP rendering

Each recipe is defined in `app/recipes/screens.json` and can be accessed via its slug.

## Adding New Recipe

To add a new recipe to the collection:

1. Create your recipe folder in the `app/recipes/screens` directory
2. Add your my-component.tsx and get-data.ts to the recipe folder
3. Add an entry to `app/recipes/screens.json` with the following structure:

```json
{
  "component-slug": {
    "title": "Component Title",
    "published": true,
    "createdAt": "YYYY-MM-DDT00:00:00Z",
    "updatedAt": "YYYY-MM-DDT00:00:00Z",
    "description": "A description of your component",
    "componentPath": "../screens/YourComponent",
    "hasDataFetch": false,
    "props": {
      // Default props for your component
      "propName": "propValue"
    },
    "tags": ["tag1", "tag2"],
    "author": {
      "name": "Your Name",
      "github": "yourgithubusername"
    },
    "version": "0.1.0",
    "category": "component-category"
  }
}
```

The component will automatically appear in the sidebar navigation and on the index page.

## Data Fetching

If your component requires dynamic data, you can create a data fetch function:

1. Create a file in `app/data` (e.g., `app/data/your-component-data.ts`) that exports a named function:

```typescript
export async function fetchYourComponentData() {
  // Fetch or generate your data here
  return {
    propName: "propValue",
    // Other props
  };
}

export default fetchYourComponentData;
```

2. Add the function to the `dataFetchFunctions` map in `utils/component-data.ts`:

```typescript
const dataFetchFunctions: Record<string, DataFetchFunction> = {
  "tailwind-test": fetchTailwindTestData,
  "your-component-slug": fetchYourComponentData,
  // Add more data fetch functions here as needed
};
```

3. Set `hasDataFetch` to `true` in your component's entry in `components.json`

The recipes system will automatically fetch the data and pass it as props to your component.

## Bitmap Rendering

The recipes system uses the `renderBmp` utility to convert components to bitmap images suitable for e-ink displays. The rendering process:

1. Uses Next.js's `ImageResponse` to render the component to a PNG
2. Converts the PNG to a 1-bit BMP using the `renderBmp` utility
3. Displays the BMP image alongside the direct component rendering

This allows you to see exactly how your component will look on an e-ink display.

## Responsive Design and Tailwind Markers

Recipe components support responsive Tailwind classes and special markers that are processed during rendering. This allows you to create layouts that adapt to different screen sizes and orientations.

### Responsive Breakpoints

The rendering system supports standard Tailwind responsive breakpoints:

- `sm:` - 640px and above
- `md:` - 768px and above
- `lg:` - 1024px and above
- `xl:` - 1280px and above
- `2xl:` - 1536px and above

You can also use `max-` prefix for maximum width queries:
- `max-sm:` - below 640px
- `max-md:` - below 768px
- `max-lg:` - below 1024px
- `max-xl:` - below 1280px
- `max-2xl:` - below 1536px

**Example:**
```tsx
<div className="flex flex-col md:flex-row gap-2 sm:gap-4">
  <div className="text-xl sm:text-2xl lg:text-3xl">Responsive Text</div>
  <div className="hidden md:block">Visible on medium screens and up</div>
</div>
```

### Dither Patterns

Special dither pattern classes are available for creating visual effects on e-ink displays:
*Compatible only with Satori rendering.*

```tsx
<div className="dither-100">
  {/* Applies dither pattern for visual effect */}
</div>
```

These patterns help create gradients and visual depth on 1-bit displays.

### Best Practices

- Use responsive classes to adapt layouts for portrait vs landscape orientations
- Test your components at different viewport sizes using the recipe preview
- Combine responsive classes with conditional rendering for maximum flexibility

## Routing

The recipes system uses Next.js's dynamic routing to provide two main views:

- `/recipes` - Index view showing all recipes
- `/recipes/[slug]` - Detailed view of a specific recipe

The `generateStaticParams` function in `app/recipes/[slug]/page.tsx` ensures that all recipe pages are pre-rendered at build time. 