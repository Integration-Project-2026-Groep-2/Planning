import { describe, expect, it } from "vitest";
import { PlanningApiError } from "../src/planningClient.js";
import { locationTools } from "../src/tools/locations.js";
import { clientReturning, clientThrowing, pickHandler, textOf } from "./helpers.js";

describe("location tools", () => {
  it("list_locations passes the upstream array through", async () => {
    const data = [{ locationId: "l1", roomName: "Aula", status: "beschikbaar" }];
    const res = await pickHandler(locationTools(clientReturning(data)), "list_locations")({});
    expect(JSON.parse(textOf(res))).toEqual(data);
  });

  it("get_location passes the upstream object through", async () => {
    const data = { locationId: "l1", roomName: "Aula" };
    const res = await pickHandler(locationTools(clientReturning(data)), "get_location")({ id: "l1" });
    expect(JSON.parse(textOf(res))).toEqual(data);
  });

  it("get_location maps a 404 to an isError result", async () => {
    const res = await pickHandler(locationTools(clientThrowing(new PlanningApiError("x", 404))), "get_location")({ id: "x" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("not found");
  });
});
