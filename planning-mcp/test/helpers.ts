import type { PlanningClient } from "../src/planningClient.js";
import type { ToolDef } from "../src/tools/shared.js";

export function clientReturning(data: unknown): PlanningClient {
  return { get: async () => data as never };
}

export function clientThrowing(err: unknown): PlanningClient {
  return {
    get: async () => {
      throw err;
    },
  };
}

export function pickHandler(defs: ToolDef[], name: string): ToolDef["handler"] {
  const def = defs.find((d) => d.name === name);
  if (!def) throw new Error(`tool ${name} not registered`);
  return def.handler;
}

export function textOf(res: { content: Array<{ text?: string }> }): string {
  return res.content[0]?.text ?? "";
}
