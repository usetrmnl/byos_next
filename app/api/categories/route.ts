import { createRegistryRouteHandler } from "@/lib/trmnl/registry";

// GET /api/categories — plugin categories from the local 24h-cached registry.
export const GET = createRegistryRouteHandler("categories");
