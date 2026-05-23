import { describe, expect, it } from "vitest";
import { PlanningApiError } from "../src/planningClient.js";
import { sessionTools } from "../src/tools/sessions.js";
import { clientReturning, clientThrowing, pickHandler, textOf } from "./helpers.js";

describe("session tools", () => {
  it("list_sessions passes the upstream array through", async () => {
    const data = [{ sessionId: "s1", title: "Keynote", status: "actief" }];
    const res = await pickHandler(sessionTools(clientReturning(data)), "list_sessions")({});
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(textOf(res))).toEqual(data);
  });

  it("get_session passes the upstream object through", async () => {
    const data = { sessionId: "s1", title: "Keynote" };
    const res = await pickHandler(sessionTools(clientReturning(data)), "get_session")({ id: "s1" });
    expect(JSON.parse(textOf(res))).toEqual(data);
  });

  it("get_session maps a 404 to an isError result", async () => {
    const res = await pickHandler(sessionTools(clientThrowing(new PlanningApiError("x", 404))), "get_session")({ id: "x" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("not found");
  });

  it("get_session_speakers strips speaker PII (email)", async () => {
    const data = [{ speakerId: "sp1", role: "keynote", firstName: "Ada", company: "ACME", email: "ada@x.io" }];
    const res = await pickHandler(sessionTools(clientReturning(data)), "get_session_speakers")({ id: "s1" });
    const out = JSON.parse(textOf(res));
    expect(out[0]).not.toHaveProperty("email");
    expect(out[0].role).toBe("keynote");
    expect(out[0].speakerId).toBe("sp1");
  });

  it("get_session_logs maps a 404 to an isError result", async () => {
    const res = await pickHandler(sessionTools(clientThrowing(new PlanningApiError("x", 404))), "get_session_logs")({ id: "x" });
    expect(res.isError).toBe(true);
  });
});
