import { z } from "zod";
import type { PlanningClient } from "../planningClient.js";
import { READ_ONLY, toToolResult, type ToolDef } from "./shared.js";

export function locationTools(client: PlanningClient): ToolDef[] {
  const lid = (args: Record<string, unknown>) => encodeURIComponent(String(args.id));
  return [
    {
      name: "list_locations",
      description: "List all locations (rooms): name, address, capacity and availability status.",
      inputSchema: {},
      annotations: READ_ONLY,
      handler: () => toToolResult(() => client.get("/api/locations"), "No locations found"),
    },
    {
      name: "get_location",
      description: "Get one location (room) by its locationId.",
      inputSchema: { id: z.string().describe("locationId (UUID)") },
      annotations: READ_ONLY,
      handler: (args) => toToolResult(() => client.get(`/api/locations/${lid(args)}`), `Location ${String(args.id)} not found`),
    },
  ];
}
