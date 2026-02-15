# 🛡️ FuzzGate

**PR-level intelligent fuzz testing gate engine.**

Stop trusting 100% unit test coverage. FuzzGate auto-generates adversarial inputs (unicode bombs, deep JSON, NaN, overflow, ReDoS patterns) and runs them against every exported function — catching crashes your tests never will.

## 🚀 Quick Start

```bash
npm install -g fuzzgate

# Fuzz all exported functions in a module
fuzzgate ./dist/utils.js

# Fuzz specific function for 5 seconds
fuzzgate ./dist/parser.js --fn parseInput --duration 5000

# Output SARIF for GitHub Code Scanning
fuzzgate ./dist/api.js --sarif > results.sarif

# JSON output for CI pipelines
fuzzgate ./dist/handlers.js --json
```

## ⚡ What It Catches

| Category | Example Input | Bug Found |
|----------|--------------|----------|
| Unicode bombs | `'💀'.repeat(10000)` | Buffer overflow, encoding crash |
| Deep nesting | `{"a":{"a":{...}}}` ×50 | Stack overflow, parser hang |
| Numeric edge | `NaN`, `Infinity`, `-0`, `2^53` | Arithmetic bugs, comparison failures |
| ReDoS patterns | `'(a+)+$'.repeat(50)` | Regex engine hang |
| Null/undefined | `null`, `undefined`, `Object.create(null)` | TypeError, null dereference |
| Injection | `' OR 1=1--`, `<img onerror=alert(1)>` | SQL/XSS injection paths |
| Type confusion | `Symbol()`, `BigInt`, `() => {}` | Serialization crash |

## 🔌 GitHub Actions

```yaml
- name: FuzzGate
  run: |
    npx fuzzgate ./dist/lib.js --sarif > fuzz.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: fuzz.sarif
```

## 💰 Pricing

| | **Free (OSS)** | **Pro $79/mo** | **Enterprise $499/mo** |
|---|---|---|---|
| CLI fuzzing | ✅ | ✅ | ✅ |
| SARIF output | ✅ | ✅ | ✅ |
| Functions/run | 5 | Unlimited | Unlimited |
| Fuzz duration | 10s | 60s+ configurable | Unlimited |
| Git diff auto-discovery | ❌ | ✅ | ✅ |
| PR comment bot | ❌ | ✅ | ✅ |
| Regression corpus mgmt | ❌ | ✅ | ✅ |
| Crash trend dashboard | ❌ | ❌ | ✅ |
| SSO / SAML | ❌ | ❌ | ✅ |
| SOC2 audit evidence PDF | ❌ | ❌ | ✅ |
| Slack/Teams alerts | ❌ | ❌ | ✅ |
| Support | Community | Email | Dedicated |

## 📊 Why Pay?

**One production crash costs $5,000–$500,000** in incident response, customer trust, and engineering time. FuzzGate Pro at $79/month pays for itself the first time it catches a crash *before* it reaches production.

- **Fintech teams**: Catch integer overflow in money calculations before PCI audit
- **Platform teams**: Block ReDoS-vulnerable regex from merging
- **API teams**: Find parser crashes before attackers do

## License

MIT (CLI core) — Pro/Enterprise features require a license key.
