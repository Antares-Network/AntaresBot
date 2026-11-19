import { describe, expect, it } from "vitest";
import { evaluateCount, KeyedQueue } from "../src/lib/services/counting.js";

const base = { authorId: "1", current: 4, lastUserId: "2" };

describe("evaluateCount", () => {
  it("accepts the next number", () => {
    expect(evaluateCount({ ...base, content: "5" })).toEqual({ kind: "ok", next: 5 });
  });
  it("tolerates surrounding whitespace", () => {
    expect(evaluateCount({ ...base, content: "  5 \n" })).toEqual({ kind: "ok", next: 5 });
  });
  it("rejects the wrong number", () => {
    expect(evaluateCount({ ...base, content: "6" })).toEqual({ kind: "wrong", expected: 5 });
  });
  it.each(["5.0", "+5", "5e0", "0x5", "five", "", "5 6", "-5"])("rejects non-integer text %j", (content) => {
    expect(evaluateCount({ ...base, content }).kind).toBe("wrong");
  });
  it("blocks the same user counting twice in a row, even with the right number", () => {
    expect(evaluateCount({ ...base, content: "5", lastUserId: "1" })).toEqual({ kind: "same-user" });
  });
  it("allows anyone when there is no previous counter (fresh/legacy data)", () => {
    expect(evaluateCount({ ...base, content: "5", lastUserId: null }).kind).toBe("ok");
  });
  it("starts at 1", () => {
    expect(evaluateCount({ ...base, current: 0, content: "1" })).toEqual({ kind: "ok", next: 1 });
  });
});

describe("KeyedQueue", () => {
  it("runs tasks for the same key strictly in order", async () => {
    const q = new KeyedQueue();
    const order: number[] = [];
    const slow = (n: number, ms: number) => () =>
      new Promise<void>((r) =>
        setTimeout(() => {
          order.push(n);
          r();
        }, ms),
      );
    await Promise.all([q.run("a", slow(1, 30)), q.run("a", slow(2, 1)), q.run("a", slow(3, 10))]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("keeps going after a task throws", async () => {
    const q = new KeyedQueue();
    await expect(q.run("a", () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(q.run("a", () => Promise.resolve(42))).resolves.toBe(42);
  });
});
