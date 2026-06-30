import { createRegistryRouteHandler } from "@/lib/trmnl/registry";

// GET /api/ips — TRMNL server IPs from the local 24h-cached registry.
export const GET = createRegistryRouteHandler("ips");
