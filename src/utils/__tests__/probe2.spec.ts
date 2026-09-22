import { describe, expect, it } from "vitest";
import { ValidationService, availableValidators } from "@fkui/logic";

describe("fkui validators", () => {
  it("lists what ValidationPlugin registers", () => {
    console.log("VALIDATORS:", availableValidators.map((v) => (v as { name: string }).name).join(","));
    console.log("HAS registerValidator:", typeof ValidationService.registerValidator);
    expect(availableValidators.length).toBeGreaterThan(0);
  });
});
