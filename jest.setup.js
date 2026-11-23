import "@testing-library/jest-dom";

// jsdom has no IntersectionObserver (next/link uses it for prefetch).
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
