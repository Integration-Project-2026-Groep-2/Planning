import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";
import { PlanningApiError } from "../planningClient.js";

export const READ_ONLY: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
  annotations: ToolAnnotations;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
};

export async function toToolResult(
  fetchFn: () => Promise<unknown>,
  notFoundMsg: string,
  transform: (data: unknown) => unknown = (d) => d,
): Promise<CallToolResult> {
  try {
    const data = transform(await fetchFn());
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  } catch (err) {
    const status = err instanceof PlanningApiError ? err.status : undefined;
    const text = status === 404 ? notFoundMsg : `Planning request failed: ${(err as Error).message}`;
    return { isError: true, content: [{ type: "text", text }] };
  }
}

const SPEAKER_PII = new Set(["email", "phoneNumber"]);

export function redactSpeakerPii(data: unknown): unknown {
  const omit = (rec: unknown): unknown =>
    rec && typeof rec === "object" && !Array.isArray(rec)
      ? Object.fromEntries(Object.entries(rec as Record<string, unknown>).filter(([k]) => !SPEAKER_PII.has(k)))
      : rec;
  return Array.isArray(data) ? data.map(omit) : omit(data);
}
