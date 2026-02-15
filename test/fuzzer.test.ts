import { fuzz, genInputs } from "../src/fuzzer";

describe("FuzzGate Core Engine", () => {
  test("detects JSON.parse crashes on adversarial input", async () => {
    function parseJSON(s: string) {
      return JSON.parse(s);
    }
    const r = await fuzz(parseJSON, "parseJSON", 3000);
    expect(r.gate).toBe("fail");
    expect(r.crashes.length).toBeGreaterThan(0);
    expect(r.crashes.some((c) => c.type === "SyntaxError")).toBe(true);
    expect(r.fn).toBe("parseJSON");
  });

  test("robust function passes gate with zero crashes", async () => {
    function safeLen(x: unknown): number {
      if (typeof x === "string") return x.length;
      if (Array.isArray(x)) return x.length;
      return 0;
    }
    const r = await fuzz(safeLen, "safeLen", 3000);
    expect(r.gate).toBe("pass");
    expect(r.crashes).toHaveLength(0);
    expect(r.runs).toBeGreaterThan(0);
  });

  test("detects TypeError on type-unsafe functions", async () => {
    function unsafeLength(s: string) {
      return s.length;
    }
    const r = await fuzz(unsafeLength, "unsafeLength", 3000);
    expect(r.gate).toBe("fail");
    expect(r.crashes.some((c) => c.type === "TypeError")).toBe(true);
  });

  test("genInputs produces correct arity and sufficient volume", () => {
    const single = genInputs(1);
    expect(single.every((args) => args.length === 1)).toBe(true);
    expect(single.length).toBeGreaterThan(30);

    const triple = genInputs(3);
    expect(triple.every((args) => args.length === 3)).toBe(true);
    expect(triple.length).toBeGreaterThanOrEqual(200);
  });

  test("deduplicates identical crash signatures", async () => {
    function alwaysThrow(_x: unknown) {
      throw new Error("boom");
    }
    const r = await fuzz(alwaysThrow, "alwaysThrow", 2000);
    expect(r.gate).toBe("fail");
    expect(r.crashes).toHaveLength(1);
    expect(r.crashes[0].error).toBe("boom");
    expect(r.runs).toBeGreaterThan(1);
  });

  test("report includes timing information", async () => {
    function noop(_x: unknown) {
      return 42;
    }
    const r = await fuzz(noop, "noop", 1000);
    expect(r.ms).toBeGreaterThan(0);
    expect(r.ms).toBeLessThan(5000);
    expect(r.gate).toBe("pass");
  });
});
