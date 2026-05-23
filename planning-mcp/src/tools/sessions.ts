import { z } from "zod";
import type { PlanningClient } from "../planningClient.js";
import { READ_ONLY, redactSpeakerPii, toToolResult, type ToolDef } from "./shared.js";

const SESSION_ID = { id: z.string().describe("sessionId (UUID)") };

export function sessionTools(client: PlanningClient): ToolDef[] {
  const sid = (args: Record<string, unknown>) => encodeURIComponent(String(args.id));
  return [
    {
      name: "list_sessions",
      description: "List all planning sessions (events): title, date, start/end time, status and location.",
      inputSchema: {},
      annotations: READ_ONLY,
      handler: () => toToolResult(() => client.get("/api/sessions"), "No sessions found"),
    },
    {
      name: "get_session",
      description: "Get one planning session by its sessionId.",
      inputSchema: SESSION_ID,
      annotations: READ_ONLY,
      handler: (args) => toToolResult(() => client.get(`/api/sessions/${sid(args)}`), `Session ${String(args.id)} not found`),
    },
    {
      name: "get_session_speakers",
      description: "List the speakers assigned to a session, with their role.",
      inputSchema: SESSION_ID,
      annotations: READ_ONLY,
      handler: (args) =>
        toToolResult(() => client.get(`/api/sessions/${sid(args)}/speakers`), `Session ${String(args.id)} not found`, redactSpeakerPii),
    },
    {
      name: "get_session_logs",
      description: "Get the change-log (reschedule/cancel history) for a session.",
      inputSchema: SESSION_ID,
      annotations: READ_ONLY,
      handler: (args) => toToolResult(() => client.get(`/api/sessions/${sid(args)}/logs`), `Session ${String(args.id)} not found`),
    },
  ];
}
