import { describe, expect, it } from "vitest";
import { valideraForKlarmarkering, valideraForSpara } from "../validering";

const GILTIGT_PERSONNUMMER = "19900101-1234";

describe("valideraForSpara", () => {
  it.each([
    ["only personnummer", { personnummer: GILTIGT_PERSONNUMMER, avsikt: "" }],
    ["only avsikt", { personnummer: "", avsikt: "Sjukpenning" }],
    ["both fields", { personnummer: GILTIGT_PERSONNUMMER, avsikt: "Sjukpenning" }],
  ])("accepts a form with %s", (_name, data) => {
    expect(valideraForSpara(data)).toBeNull();
  });

  it("accepts a personnummer that is not finished yet", () => {
    // Half-typed work is exactly what Spara is for; only Klarmarkera insists.
    expect(valideraForSpara({ personnummer: "1990", avsikt: "" })).toBeNull();
  });

  it.each([
    ["empty strings", { personnummer: "", avsikt: "" }],
    ["nulls", { personnummer: null, avsikt: null }],
    ["whitespace only", { personnummer: "  ", avsikt: "\n\t " }],
  ])("rejects a form with nothing in it: %s", (_name, data) => {
    expect(valideraForSpara(data)).toContain("inget att spara");
  });
});

describe("valideraForKlarmarkering", () => {
  it("accepts both fields filled with a real personnummer", () => {
    expect(
      valideraForKlarmarkering({
        personnummer: GILTIGT_PERSONNUMMER,
        avsikt: "Sjukpenning",
      }),
    ).toBeNull();
  });

  it.each([
    ["both empty", { personnummer: "", avsikt: "" }],
    ["personnummer empty", { personnummer: "", avsikt: "Sjukpenning" }],
    ["avsikt empty", { personnummer: GILTIGT_PERSONNUMMER, avsikt: "" }],
    ["both null", { personnummer: null, avsikt: null }],
    ["whitespace only", { personnummer: "  ", avsikt: "   " }],
  ])("rejects an incomplete form: %s", (_name, data) => {
    expect(valideraForKlarmarkering(data)).toContain("Uppgifterna är ofullständiga");
  });

  it.each([
    ["a truncated number", "19900101-123"],
    ["not a number at all", "inget personnummer"],
  ])("rejects a personnummer with %s", (_name, personnummer) => {
    expect(valideraForKlarmarkering({ personnummer, avsikt: "Sjukpenning" })).toContain(
      "Personnumret är inte giltigt",
    );
  });

  it("accepts the shorthand forms a handläggare may type", () => {
    for (const personnummer of ["900101-1234", "900101+1234"]) {
      expect(valideraForKlarmarkering({ personnummer, avsikt: "Sjukpenning" })).toBeNull();
    }
  });
});
