// scripts/status-gate.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const tmpDir = resolve(root, 'tmp');
const logsDir = resolve(tmpDir, 'logs');

mkdirSync(tmpDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });

function run(cmd, args, name) {
  const res = spawnSync(cmd, args, { cwd: root, shell: false, encoding: 'utf8' });
  const out = (res.stdout || '') + '\n' + (res.stderr || '');
  writeFileSync(resolve(logsDir, `${name}.log`), out);
  return { code: res.status ?? 1, out };
}

function hasScript(name) {
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    return Boolean(pkg.scripts && pkg.scripts[name]);
  } catch { return false; }
}

// --- Patterns (Red Flags) ---
const redFlagPatterns = [
  /React has detected a change in the order of Hooks/i,
  /Rendered more hooks than during the previous render/i,
  /Cannot convert object to primitive value/i,
  /No matching export/i,
  /already been declared/i,
  /Failed to resolve import/i,
  /✘ \[ERROR]/,
  /ERROR in /i,
  /Expected "finally" but found "}"|Unexpected "\*\*"/,
];

const yellowFlagPatterns = [
  /Warning:/i,
  /deprecated/i,
];

// --- 1) BUILD ---
const build = run('npm', ['run', 'build', '--silent'], 'build');
const buildOK = build.code === 0;

// --- 2) TEST ---
const testArgs = ['run', 'test', '--silent', '--', '--reporter', 'verbose'];
const tests = run('npm', testArgs, 'test');
const testOK = tests.code === 0;

// Extract simple vitest summary if available
const testSummary = (() => {
  const m1 = tests.out.match(/Test Files\s+(\d+)\s+passed.*?(\d+)\s+failed/si);
  const m2 = tests.out.match(/(\d+)\s+passed.*?(\d+)\s+failed/si);
  if (m1) return { filesPassed: +m1[1], filesFailed: +m1[2] };
  if (m2) return { passed: +m2[1], failed: +m2[2] };
  return null;
})();

// --- 3) LINT (optional) ---
let lintOK = true;
let lint = { code: 0, out: 'lint skipped (no script)' };
if (hasScript('lint')) {
  lint = run('npm', ['run', 'lint', '--silent'], 'lint');
  lintOK = lint.code === 0;
} else {
  writeFileSync(resolve(logsDir, 'lint.log'), lint.out);
}

// --- Scan outputs for flags ---
function scan(out, patterns) {
  const hits = [];
  for (const rx of patterns) {
    const m = out.match(rx);
    if (m) hits.push(rx.toString());
  }
  return [...new Set(hits)];
}
const allOut = [build.out, tests.out, lint.out].join('\n');
const redHits = scan(allOut, redFlagPatterns);
const yellowHits = scan(allOut, yellowFlagPatterns);

// --- Compose report ---
const emoji = (ok) => ok ? '✅' : '❌';
const warn = (arr) => arr.length ? `\n**Hinweise/Warnings:**\n- ${arr.join('\n- ')}` : '';
const red = (arr) => arr.length ? `\n**Red Flags (bitte fixen):**\n- ${arr.join('\n- ')}` : '';

const summaryMd = `# Status-Report

## Build ${emoji(buildOK)}
Log: tmp/logs/build.log

## Tests ${emoji(testOK)}
Log: tmp/logs/test.log${testSummary ? `
- Summary: ${JSON.stringify(testSummary)}` : ''}

## Lint ${emoji(lintOK)}
Log: tmp/logs/lint.log

${red(redHits)}
${warn(yellowHits)}

---

## Quick-Checks
- Keine Hook-Order-Fehler: ${/order of Hooks/i.test(allOut) ? '❌' : '✅'}
- Kein React.lazy/Primitive-Error: ${/Cannot convert object to primitive value/i.test(allOut) ? '❌' : '✅'}
- Keine Export-/Import-Resolver-Fehler: ${/(No matching export|Failed to resolve import)/i.test(allOut) ? '❌' : '✅'}
- Keine doppelten Deklarationen: ${/already been declared/i.test(allOut) ? '❌' : '✅'}
`;

writeFileSync(resolve(tmpDir, 'status-report.md'), summaryMd);
writeFileSync(resolve(tmpDir, 'status-report.txt'), summaryMd.replace(/\*\*/g, ''));

const allGreen = buildOK && testOK && lintOK && redHits.length === 0;
process.stdout.write(summaryMd + '\n');
process.exit(allGreen ? 0 : 1);