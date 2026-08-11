import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Radix and react-day-picker both measure elements on open; jsdom has no layout engine, so
// stub the observers and the pointer-capture API they reach for rather than letting them throw.
// Recharts refuses to draw into a zero-sized container, and jsdom measures everything as zero,
// so the stub reports a fixed viewport the moment an element is observed.
const OBSERVED_SIZE = { width: 800, height: 600 };

class ResizeObserverStub implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { ...OBSERVED_SIZE } } as unknown as ResizeObserverEntry],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

afterEach(cleanup);
