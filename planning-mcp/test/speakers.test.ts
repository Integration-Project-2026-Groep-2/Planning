import { describe, expect, it } from "vitest";
import { PlanningApiError } from "../src/planningClient.js";
import { speakerTools } from "../src/tools/speakers.js";
import { clientReturning, clientThrowing, pickHandler, textOf } from "./helpers.js";

describe("speaker tools", () => {
  it("list_speakers strips speaker PII (email, phoneNumber)", async () => {
    const data = [
      { speakerId: "sp1", firstName: "Ada", lastName: "Lovelace", company: "ACME", email: "ada@x.io", phoneNumber: "+3212" },
    ];
    const res = await pickHandler(speakerTools(clientReturning(data)), "list_speakers")({});
    const out = JSON.parse(textOf(res));
    expect(out).toEqual([{ speakerId: "sp1", firstName: "Ada", lastName: "Lovelace", company: "ACME" }]);
    expect(out[0]).not.toHaveProperty("email");
    expect(out[0]).not.toHaveProperty("phoneNumber");
  });

  it("get_speaker strips speaker PII (email, phoneNumber)", async () => {
    const data = { speakerId: "sp1", firstName: "Ada", company: "ACME", email: "ada@x.io", phoneNumber: "+3212" };
    const res = await pickHandler(speakerTools(clientReturning(data)), "get_speaker")({ id: "sp1" });
    const out = JSON.parse(textOf(res));
    expect(out).not.toHaveProperty("email");
    expect(out).not.toHaveProperty("phoneNumber");
    expect(out.speakerId).toBe("sp1");
  });

  it("get_speaker maps a 404 to an isError result", async () => {
    const res = await pickHandler(speakerTools(clientThrowing(new PlanningApiError("x", 404))), "get_speaker")({ id: "x" });
    expect(res.isError).toBe(true);
  });
});
