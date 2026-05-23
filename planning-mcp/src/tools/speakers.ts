import { z } from "zod";
import type { PlanningClient } from "../planningClient.js";
import { READ_ONLY, redactSpeakerPii, toToolResult, type ToolDef } from "./shared.js";

export function speakerTools(client: PlanningClient): ToolDef[] {
  const sid = (args: Record<string, unknown>) => encodeURIComponent(String(args.id));
  return [
    {
      name: "list_speakers",
      description: "List all speakers: name, company and active status.",
      inputSchema: {},
      annotations: READ_ONLY,
      handler: () => toToolResult(() => client.get("/api/speakers"), "No speakers found", redactSpeakerPii),
    },
    {
      name: "get_speaker",
      description: "Get one speaker by its speakerId.",
      inputSchema: { id: z.string().describe("speakerId (UUID)") },
      annotations: READ_ONLY,
      handler: (args) =>
        toToolResult(() => client.get(`/api/speakers/${sid(args)}`), `Speaker ${String(args.id)} not found`, redactSpeakerPii),
    },
  ];
}
