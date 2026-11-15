import "@testing-library/jest-dom";
import { JSDOM } from "jsdom";
import { afterAll } from "vitest";

// New Node versions expose their own storage; browser tests must use jsdom's.
const storageWindow = new JSDOM("", { url: "http://localhost" }).window;
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storageWindow.localStorage });
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storageWindow.sessionStorage });
afterAll(() => storageWindow.close());

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
