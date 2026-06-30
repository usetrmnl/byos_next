import { createRegistryRouteHandler } from "@/lib/trmnl/registry";

// GET /api/models — device models from the local 24h-cached TRMNL registry.
export const GET = createRegistryRouteHandler("models");
