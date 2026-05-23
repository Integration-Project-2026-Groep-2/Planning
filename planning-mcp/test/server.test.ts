import { describe, expect, it } from "vitest";
import { buildToolDefs } from "../src/server.js";
import { clientReturning } from "./helpers.js";

const EXPECTED = [
  "list_sessions",
  "get_session",
  "get_session_speakers",
  "get_session_logs",
  "list_locations",
  "get_location",
  "list_speakers",
  "get_speaker",
].sort();

// Jarvis (mcp-master) routes by tool name across all servers; a clash is a fatal pool-startup error.
const CRM_TOOLS = [
  "search_contact", "get_contact", "count_contacts", "recent_contacts", "list_contacts",
  "search_company", "get_company", "get_company_profile", "count_companies",
  "create_company", "update_company", "delete_company",
  "create_contact", "update_contact", "delete_contact",
];
const CONTROLROOM_TOOLS = ["error_analysis", "heartbeat_status", "statuscheck_summary", "fetch_logs", "fetch_recent_deploys"];

describe("buildToolDefs", () => {
  const defs = buildToolDefs(clientReturning([]));

  it("registers exactly 8 tools", () => {
    expect(defs).toHaveLength(8);
  });

  it("exposes the expected tool names", () => {
    expect(defs.map((d) => d.name).sort()).toEqual(EXPECTED);
  });

  it("marks every tool read-only", () => {
    for (const d of defs) {
      expect(d.annotations.readOnlyHint).toBe(true);
    }
  });

  it("has no name collision with CRM or Controlroom tools", () => {
    const others = new Set([...CRM_TOOLS, ...CONTROLROOM_TOOLS]);
    const clashes = defs.map((d) => d.name).filter((n) => others.has(n));
    expect(clashes).toEqual([]);
  });
});
