import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts uses `globals: false`, so RTL's auto-cleanup is not
// registered automatically; clean up the DOM between tests explicitly.
afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
