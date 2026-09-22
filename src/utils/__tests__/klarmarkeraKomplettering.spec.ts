import { describe, expect, it, vi } from "vitest";
import { klarmarkeraKomplettering } from "../klarmarkeraKomplettering";
import { useKompletteringStore } from "../../stores/KompletteringStore";
import { KlarmarkeraResultat } from "../../types";
import { mockResponse, stubFetch } from "./testHelpers";

function listenForTaskDone() {
  const listener = vi.fn();
  window.addEventListener("task-done", listener);
  return listener;
}

describe("klarmarkeraKomplettering", () => {
  it("POSTs to the done endpoint", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));
    await klarmarkeraKomplettering("h-123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/h-123/komplettering/done"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("notifies the host portal on success", async () => {
    stubFetch(mockResponse({ status: 204 }));
    const listener = listenForTaskDone();

    await expect(klarmarkeraKomplettering("h-123")).resolves.toBe(KlarmarkeraResultat.KLAR);

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      handlaggningId: "h-123",
    });
  });

  it("reports an incomplete yrkande for 422", async () => {
    stubFetch(mockResponse({ ok: false, status: 422 }));
    await expect(klarmarkeraKomplettering("h-123")).resolves.toBe(
      KlarmarkeraResultat.OFULLSTANDIG,
    );
    const error = useKompletteringStore().error;
    expect(error).toContain("ofullständiga");
    // Reachable right after a successful save, so it must not tell them to save.
    expect(error).not.toContain("spara");
  });

  it("reports an expired correlation for 409", async () => {
    stubFetch(mockResponse({ ok: false, status: 409 }));
    await expect(klarmarkeraKomplettering("h-123")).resolves.toBe(KlarmarkeraResultat.UTGANGEN);
    expect(useKompletteringStore().error).toContain("gått ut");
  });

  it("does not notify the host portal when completion failed", async () => {
    stubFetch(mockResponse({ ok: false, status: 422 }));
    const listener = listenForTaskDone();
    await klarmarkeraKomplettering("h-123");
    expect(listener).not.toHaveBeenCalled();
  });

  it("falls back to a generic error for any other status", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));
    await expect(klarmarkeraKomplettering("h-123")).resolves.toBe(KlarmarkeraResultat.FEL);
    expect(useKompletteringStore().error).toContain("Kunde inte klarmarkera");
  });

  it("clears the saving flag whichever way the call ends", async () => {
    stubFetch(mockResponse({ ok: false, status: 409 }));
    await klarmarkeraKomplettering("h-123");
    expect(useKompletteringStore().saving).toBe(false);
  });
});
