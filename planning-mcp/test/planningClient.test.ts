import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlanningClient, PlanningApiError } from "../src/planningClient.js";

function fakeResponse(body: unknown, init: { ok: boolean; status: number }): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: async () => body,
  } as unknown as Response;
}

describe("planningClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed JSON on 200", async () => {
    const body = [{ sessionId: "s1", title: "Keynote" }];
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse(body, { ok: true, status: 200 })));
    const client = createPlanningClient("http://planning:3000");
    await expect(client.get("/api/sessions")).resolves.toEqual(body);
  });

  it("calls fetch with baseUrl + path", async () => {
    const fetchMock = vi.fn(async () => fakeResponse({}, { ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createPlanningClient("http://planning:3000");
    await client.get("/api/sessions");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://planning:3000/api/sessions");
  });

  it("throws PlanningApiError with status on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse({}, { ok: false, status: 404 })));
    const client = createPlanningClient("http://planning:3000");
    const err = await client.get("/api/sessions/x").catch((e) => e);
    expect(err).toBeInstanceOf(PlanningApiError);
    expect(err.status).toBe(404);
  });

  it("throws PlanningApiError without status on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));
    const client = createPlanningClient("http://planning:3000");
    const err = await client.get("/api/sessions").catch((e) => e);
    expect(err).toBeInstanceOf(PlanningApiError);
    expect(err.status).toBeUndefined();
  });

  it("aborts and throws a timeout PlanningApiError when fetch exceeds the timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const e = new Error("aborted");
              e.name = "AbortError";
              reject(e);
            });
          }),
      ),
    );
    const client = createPlanningClient("http://planning:3000", 20);
    const err = await client.get("/api/sessions").catch((e) => e);
    expect(err).toBeInstanceOf(PlanningApiError);
    expect(err.message).toContain("timed out");
    expect(err.status).toBeUndefined();
  });
});
