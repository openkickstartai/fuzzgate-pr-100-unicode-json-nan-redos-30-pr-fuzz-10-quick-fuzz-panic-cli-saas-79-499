export interface Crash {
  input: unknown[];
  error: string;
  type: string;
  ms: number;
}

export interface Report {
  fn: string;
  runs: number;
  crashes: Crash[];
  ms: number;
  gate: "pass" | "fail";
}

const S: unknown[] = [
  "",
  "\0",
  "a".repeat(100_000),
  "\ud83d\udca9".repeat(10_000),
  "\ud800",
  '{"a":'.repeat(50) + "1" + "}".repeat(50),
  "' OR 1=1 --",
  "<img onerror=alert(1)>",
  "(a+)+$".repeat(50),
  "../../../etc/passwd",
  "null",
  "undefined",
  "NaN",
  "\n".repeat(10_000),
  "\xff\xfe\x00\x01",
];

const N: unknown[] = [
  0, -0, -1, 0.1, NaN, Infinity, -Infinity, 1e308, 5e-324,
  Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
  -(2 ** 31) - 1, 2 ** 32, 2 ** 53,
];

const O: unknown[] = [
  null, undefined, true, false,
  {}, [], [null, undefined],
  Object.create(null),
  new Array(10_000).fill(0),
  () => {},
  Symbol("fuzz"),
];

const ALL = [...S, ...N, ...O];
const pick = () => ALL[Math.floor(Math.random() * ALL.length)];

export function genInputs(arity: number): unknown[][] {
  const corpus: unknown[][] = [];
  if (arity <= 1) {
    for (const v of ALL) corpus.push([v]);
  }
  for (let i = 0; i < 200; i++) {
    const row: unknown[] = [];
    for (let j = 0; j < arity; j++) row.push(pick());
    corpus.push(row);
  }
  return corpus;
}

function safe(v: unknown): unknown {
  if (typeof v === "symbol") return "Symbol(fuzz)";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "function") return "[Function]";
  return v;
}

export async function fuzz(
  fn: Function,
  name: string,
  duration = 10_000,
  timeout = 5_000
): Promise<Report> {
  const arity = Math.max(fn.length, 1);
  const corpus = genInputs(arity);
  const crashes: Crash[] = [];
  const seen = new Set<string>();
  const t0 = Date.now();
  let runs = 0;

  for (const input of corpus) {
    if (Date.now() - t0 > duration) break;
    runs++;
    const ts = Date.now();
    try {
      const r = fn(...input);
      if (r && typeof r === "object" && typeof r.then === "function") {
        await Promise.race([
          r,
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error("TIMEOUT")), timeout)
          ),
        ]);
      }
    } catch (e: any) {
      const key = `${e.constructor?.name}:${e.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        crashes.push({
          input: input.map(safe),
          error: String(e.message ?? e),
          type:
            e.message === "TIMEOUT"
              ? "timeout"
              : e.constructor?.name ?? "Error",
          ms: Date.now() - ts,
        });
      }
    }
  }

  return {
    fn: name,
    runs,
    crashes,
    ms: Date.now() - t0,
    gate: crashes.length > 0 ? "fail" : "pass",
  };
}
