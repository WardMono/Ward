import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.argv[2] ?? process.cwd();
const skip = new Set([
  "node_modules",
  "dist",
  "out",
  "release",
  "coverage",
  ".git",
  ".cursor",
]);
const exts = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".html",
  ".css",
  ".yml",
  ".yaml",
]);

const rules = [
  {
    id: "math-random",
    severity: "high",
    re: /Math\.random\s*\(/,
    note: "PRD forbids Math.random for security. A hit in UI motion still needs a reason.",
  },
  {
    id: "eval-or-function",
    severity: "high",
    re: /\beval\s*\(|new\s+Function\s*\(/,
    note: "Forbidden by the Electron hardening checklist.",
  },
  {
    id: "node-integration",
    severity: "high",
    re: /nodeIntegration\s*:\s*true/,
    note: "nodeIntegration must stay false.",
  },
  {
    id: "context-isolation-off",
    severity: "high",
    re: /contextIsolation\s*:\s*false/,
    note: "contextIsolation must stay true.",
  },
  {
    id: "web-security-off",
    severity: "high",
    re: /webSecurity\s*:\s*false/,
    note: "webSecurity must stay true.",
  },
  {
    id: "dangerously-set",
    severity: "medium",
    re: /dangerouslySetInnerHTML/,
    note: "Allowed only with a sanitizer on the same call path.",
  },
  {
    id: "cdn",
    severity: "high",
    re: /fonts\.googleapis|cdnjs\.|unpkg\.com|jsdelivr\.net|cdn\.jsdelivr/,
    note: "No CDN. Fonts and scripts ship in the bundle.",
  },
  {
    id: "console-in-crypto",
    severity: "high",
    re: /console\.(log|debug|info|warn|error|dir)\s*\(/,
    path: /[/\\]crypto[/\\]/,
    note: "crypto/ must not log. A test may spy on a logger; it must not call console in src.",
  },
  {
    id: "local-storage",
    severity: "medium",
    re: /localStorage|sessionStorage/,
    note: "UI prefs go through prefs:set, not web storage. Confirm this hit stores no secret.",
  },
  {
    id: "generic-ipc",
    severity: "high",
    re: /ipcRenderer\.(invoke|send)\s*\(/,
    path: /[/\\](preload|renderer)[/\\]/,
    note: "A hit is only a defect if the channel string is chosen by the renderer. A typed wrapper that calls one fixed channel is fine.",
  },
];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (exts.has(extname(name))) out.push(p);
  }
}

function redact(line) {
  if (/password|secret|vaultkey|recovery|ciphertext/i.test(line)) {
    return line.replace(/(['"`])[^'"`]{8,}\1/g, "$1[redacted]$1").slice(0, 180);
  }
  return line.trim().slice(0, 180);
}

const files = [];
walk(root, files);
const findings = [];

for (const file of files) {
  const rel = relative(root, file);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  for (const rule of rules) {
    if (rule.path && !rule.path.test(rel)) continue;
    lines.forEach((line, i) => {
      if (!rule.re.test(line)) return;
      rule.re.lastIndex = 0;
      findings.push({
        severity: rule.severity,
        id: rule.id,
        file: rel.replaceAll("\\", "/"),
        line: i + 1,
        note: rule.note,
        snippet: redact(line),
      });
    });
  }
}

const high = findings.filter((f) => f.severity === "high").length;
console.log("WARD_SCAN");
console.log(`root: ${root}`);
console.log(`files: ${files.length}`);
console.log(`findings: ${findings.length}`);
console.log(`high: ${high}`);
for (const f of findings) {
  console.log(`${f.severity}\t${f.id}\t${f.file}:${f.line}`);
  console.log(`  ${f.snippet}`);
  console.log(`  ${f.note}`);
}
process.exit(high > 0 ? 1 : 0);
