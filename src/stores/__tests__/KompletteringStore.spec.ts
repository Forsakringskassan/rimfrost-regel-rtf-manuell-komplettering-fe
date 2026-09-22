import { describe, expect, it } from "vitest";
import { useKompletteringStore } from "../KompletteringStore";

describe("KompletteringStore", () => {
  it("starts with nothing loaded, nothing saved and no error", () => {
    const store = useKompletteringStore();
    expect(store).toMatchObject({
      loading: false,
      saving: false,
      error: null,
      sparad: false,
      uppgiftsbeskrivning: "",
      descriptionLoading: false,
      descriptionError: false,
    });
  });
});
