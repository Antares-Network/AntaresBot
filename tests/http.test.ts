import { describe, expect, it } from "vitest";
import { safeImageUrl } from "../src/lib/http.js";

describe("safeImageUrl", () => {
  const hosts = ["random-d.uk", "thecatapi.com"];

  it("accepts https from an allowed host or its subdomain", () => {
    expect(safeImageUrl("https://cdn2.thecatapi.com/images/a.jpg", hosts)).toBe("https://cdn2.thecatapi.com/images/a.jpg");
  });
  it("upgrades http from an allowed host to https (random-d.uk returns http)", () => {
    expect(safeImageUrl("http://random-d.uk/api/194.jpg", hosts)).toBe("https://random-d.uk/api/194.jpg");
  });
  it.each([
    "https://evil.example/cat.jpg",
    "https://thecatapi.com.evil.example/a.jpg", // suffix trick
    "https://evilthecatapi.com/a.jpg", // not a subdomain
    "https://user:pw@thecatapi.com/a.jpg",
    "https://thecatapi.com:8443/a.jpg",
    "javascript:alert(1)",
    "ftp://thecatapi.com/a.jpg",
    "not a url",
  ])("rejects %s", (u) => {
    expect(safeImageUrl(u, hosts)).toBeNull();
  });
});
