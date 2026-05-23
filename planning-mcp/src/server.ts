import { McpServer, type ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { getConfig } from "./config.js";
import { createPlanningClient, type PlanningClient } from "./planningClient.js";
import { locationTools } from "./tools/locations.js";
import { sessionTools } from "./tools/sessions.js";
import { speakerTools } from "./tools/speakers.js";
import type { ToolDef } from "./tools/shared.js";

export function buildToolDefs(client: PlanningClient): ToolDef[] {
  return [...sessionTools(client), ...locationTools(client), ...speakerTools(client)];
}

export function buildMcpServer(): McpServer {
  const client = createPlanningClient(getConfig().apiBaseUrl);
  const server = new McpServer({ name: "planning-mcp", version: "1.0.0" });
  for (const def of buildToolDefs(client)) {
    server.registerTool(
      def.name,
      { description: def.description, inputSchema: def.inputSchema, annotations: def.annotations },
      def.handler as unknown as ToolCallback<ZodRawShape>,
    );
  }
  return server;
}
