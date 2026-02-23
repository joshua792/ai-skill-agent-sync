import { describe, it, expect } from "vitest";
import { hashContent } from "../lib/hash.js";

describe("hashContent", () => {
  it("returns consistent SHA-256 hex", () => {
    const a = hashContent("hello world");
    const b = hashContent("hello world");
    expect(a).toBe(b);
  });

  it("different content produces different hash", () => {
    const a = hashContent("hello");
    const b = hashContent("world");
    expect(a).not.toBe(b);
  });

  it("returns a 64-char hex string", () => {
    const hash = hashContent("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("empty string has known hash", () => {
    const hash = hashContent("");
    // SHA-256 of empty string
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});
