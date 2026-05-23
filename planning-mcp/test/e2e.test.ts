import http from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/index.js";

const SESSIONS = [{ sessionId: "s1", title: "Keynote", date: "2026-06-01", startTime: "10:00:00", status: "actief" }];
const SPEAKER = {
  speakerId: "sp1",
  firstName: "Ada",
  lastName: "Lovelace",
  company: "ACME",
  email: "ada@x.io",
  phoneNumber: "+3212",
};

let planningStub: Server;
let mcpServer: Server;
let mcpUrl: string;
const savedBaseUrl = process.env.PLANNING_API_BASE_URL;

beforeAll(async () => {
  planningStub = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/sessions") {
      res.end(JSON.stringify(SESSIONS));
    } else if (req.url === "/api/speakers/sp1") {
      res.end(JSON.stringify(SPEAKER));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    }
  });
  await new Promise<void>((resolve) => planningStub.listen(0, resolve));
  process.env.PLANNING_API_BASE_URL = `http://127.0.0.1:${(planningStub.address() as AddressInfo).port}`;

  await new Promise<void>((resolve) => {
    mcpServer = app.listen(0, resolve);
  });
  mcpUrl = `http://127.0.0.1:${(mcpServer.address() as AddressInfo).port}/mcp`;
});

afterAll(async () => {
  process.env.PLANNING_API_BASE_URL = savedBaseUrl;
  await new Promise<void>((resolve, reject) => mcpServer.close((e) => (e ? reject(e) : resolve())));
  await new Promise<void>((resolve, reject) => planningStub.close((e) => (e ? reject(e) : resolve())));
});

async function connect(): Promise<Client> {
  const client = new Client({ name: "e2e", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl)));
  return client;
}

function toolText(res: { content: unknown }): string {
  return (res.content as Array<{ text?: string }>)[0]?.text ?? "";
}

describe("e2e: MCP client -> planning-mcp -> Planning API", () => {
  it("lists the 8 tools", async () => {
    const client = await connect();
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(8);
    expect(tools.tools.map((t) => t.name)).toContain("list_sessions");
    await client.close();
  });

  it("calls list_sessions through to the Planning API", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "list_sessions", arguments: {} });
    expect(JSON.parse(toolText(res))).toEqual(SESSIONS);
    await client.close();
  });

  it("redacts speaker PII end-to-end via get_speaker", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "get_speaker", arguments: { id: "sp1" } });
    const out = JSON.parse(toolText(res));
    expect(out.speakerId).toBe("sp1");
    expect(out).not.toHaveProperty("email");
    expect(out).not.toHaveProperty("phoneNumber");
    await client.close();
  });

  it("returns an isError result for a missing session (404)", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "get_session", arguments: { id: "nope" } });
    expect(res.isError).toBe(true);
    await client.close();
  });
});
