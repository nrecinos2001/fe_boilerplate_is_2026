import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisiblePolling, type VisibilitySource } from "./visible-polling";

class FakeDocument implements VisibilitySource {
  visibilityState: DocumentVisibilityState;
  private listeners = new Set<() => void>();

  constructor(state: DocumentVisibilityState) {
    this.visibilityState = state;
  }

  addEventListener(_type: "visibilitychange", listener: () => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "visibilitychange", listener: () => void) {
    this.listeners.delete(listener);
  }

  setState(state: DocumentVisibilityState) {
    this.visibilityState = state;
    for (const l of this.listeners) l();
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

describe("startVisiblePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consulta al arrancar y luego cada 30 segundos", () => {
    const task = vi.fn();
    const doc = new FakeDocument("visible");
    const stop = startVisiblePolling(task, 30_000, doc);

    expect(task).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(task).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_000);
    expect(task).toHaveBeenCalledTimes(4);
    stop();
  });

  it("se detiene mientras la pestaña está oculta", () => {
    const task = vi.fn();
    const doc = new FakeDocument("visible");
    const stop = startVisiblePolling(task, 30_000, doc);

    doc.setState("hidden");
    vi.advanceTimersByTime(120_000);
    expect(task).toHaveBeenCalledTimes(1);
    stop();
  });

  it("al volver a la pestaña consulta de inmediato y retoma el intervalo", () => {
    const task = vi.fn();
    const doc = new FakeDocument("visible");
    const stop = startVisiblePolling(task, 30_000, doc);

    doc.setState("hidden");
    vi.advanceTimersByTime(90_000);
    doc.setState("visible");
    expect(task).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(30_000);
    expect(task).toHaveBeenCalledTimes(3);
    stop();
  });

  it("si arranca con la pestaña oculta no consulta hasta que se muestre", () => {
    const task = vi.fn();
    const doc = new FakeDocument("hidden");
    const stop = startVisiblePolling(task, 30_000, doc);

    vi.advanceTimersByTime(60_000);
    expect(task).not.toHaveBeenCalled();
    doc.setState("visible");
    expect(task).toHaveBeenCalledTimes(1);
    stop();
  });

  it("al apagarlo deja de consultar y quita el listener", () => {
    const task = vi.fn();
    const doc = new FakeDocument("visible");
    const stop = startVisiblePolling(task, 30_000, doc);

    stop();
    vi.advanceTimersByTime(120_000);
    doc.setState("visible");
    expect(task).toHaveBeenCalledTimes(1);
    expect(doc.listenerCount).toBe(0);
  });
});
