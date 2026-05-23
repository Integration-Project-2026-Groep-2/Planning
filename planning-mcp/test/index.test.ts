import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/index.js";

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

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("planning-mcp http", () => {
  it("GET /health returns ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "planning-mcp" });
  });

  it("an MCP client can list the 8 tools", async () => {
    const client = new Client({ name: "planning-mcp-test", version: "0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
    const result = await client.listTools();
    expect(result.tools.map((t) => t.name).sort()).toEqual(EXPECTED);
    await client.close();
  });
});
