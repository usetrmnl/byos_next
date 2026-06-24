import { createRegistryRouteHandler } from "@/lib/trmnl/registry";

// GET /api/palettes — palettes from the local 24h-cached TRMNL registry.
export const GET = createRegistryRouteHandler("palettes");
