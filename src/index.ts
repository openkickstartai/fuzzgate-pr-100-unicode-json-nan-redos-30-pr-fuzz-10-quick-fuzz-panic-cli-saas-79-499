#!/usr/bin/env node
import { resolve } from "path";
import { fuzz, Report } from "./fuzzer";

function toSARIF(reports: Report[]) {
  return {
    version: "2.1.0" as const,
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: { name: "FuzzGate", version: "1.0.0", rules: [] },
        },
        results: reports.flatMap((r) =>
          r.crashes.map((c) => ({
            ruleId: `fuzz/${c.type}`,
            level: "error" as const,
            message: {
              text: `${r.fn}(): ${c.error} | input: ${JSON.stringify(c.input).slice(0, 200)}`,
            },
          }))
        ),
      },
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  let file = "";
  const fns: string[] = [];
  let duration = 10_000;
  let timeout = 5_000;
  let json = false;
  let sarif = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--fn") fns.push(args[++i]);
    else if (a === "--duration") duration = +args[++i];
    else if (a === "--timeout") timeout = +args[++i];
    else if (a === "--json") json = true;
    else if (a === "--sarif") sarif = true;
    else if (!file) file = a;
  }

  if (!file) {
    console.log(
      "Usage: fuzzgate <file.js> [--fn name] [--duration 10000] [--timeout 5000] [--json] [--sarif]"
    );
    return;
  }

  const mod = require(resolve(file));
  const names = fns.length
    ? fns
    : Object.keys(mod).filter((k) => typeof mod[k] === "function");

  if (!names.length) {
    console.error("❌ No exported functions found");
    process.exit(1);
  }

  const reports: Report[] = [];
  for (const name of names) {
    if (typeof mod[name] !== "function") {
      console.error(`⚠ ${name} is not a function, skipping`);
      continue;
    }
    process.stderr.write(`⚡ Fuzzing ${name}...`);
    const r = await fuzz(mod[name], name, duration, timeout);
    reports.push(r);
    if (!json && !sarif) {
      const icon = r.gate === "pass" ? "✅" : "❌";
      console.log(
        ` ${icon} ${r.runs} runs, ${r.crashes.length} unique crashes (${r.ms}ms)`
      );
      for (const c of r.crashes) {
        console.log(`   💥 [${c.type}] ${c.error}`);
        console.log(
          `      Input: ${JSON.stringify(c.input).slice(0, 120)}`
        );
      }
    }
  }

  if (sarif) console.log(JSON.stringify(toSARIF(reports), null, 2));
  else if (json) console.log(JSON.stringify(reports, null, 2));

  const failed = reports.some((r) => r.gate === "fail");
  if (!json && !sarif) {
    console.log(failed ? "\n🚫 Gate: FAIL" : "\n✅ Gate: PASS");
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
