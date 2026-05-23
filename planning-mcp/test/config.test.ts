import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfig } from "../src/config.js";

describe("getConfig", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.PLANNING_API_BASE_URL;
    delete process.env.PLANNING_MCP_PORT;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("returns defaults when env is unset", () => {
    const cfg = getConfig();
    expect(cfg.apiBaseUrl).toBe("http://localhost:3000");
    expect(cfg.port).toBe(5556);
  });

  it("reads overrides from env", () => {
    process.env.PLANNING_API_BASE_URL = "http://planning:3000";
    process.env.PLANNING_MCP_PORT = "8090";
    const cfg = getConfig();
    expect(cfg.apiBaseUrl).toBe("http://planning:3000");
    expect(cfg.port).toBe(8090);
  });

  it("strips a trailing slash from the base url", () => {
    process.env.PLANNING_API_BASE_URL = "http://planning:3000/";
    expect(getConfig().apiBaseUrl).toBe("http://planning:3000");
  });
});
