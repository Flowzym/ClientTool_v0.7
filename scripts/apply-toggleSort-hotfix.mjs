#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CANDIDATES = [
  'src/features/board/Board.tsx',
  'src/features/board/components/Board.tsx',
  'src/features/board/board/Board.tsx'
];

function pick() {
  for (const rel of CANDIDATES) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function run() {
  const file = pick();
  if (!file) {
    console.error('[hotfix] Board.tsx not found in known paths:', CANDIDATES);
    process.exit(2);
  }
  let code = fs.readFileSync(file, 'utf8');
  let before = code;

  // Inline handler pattern
  code = code.replace(/onToggle=\{\(\)\s*=>\s*toggleSort\('/g, "onToggle={() => handleHeaderToggle('");

  // Any other calls
  if (/toggleSort\(/.test(code)) {
    code = code.replace(/toggleSort\(/g, 'handleHeaderToggle(');
  }

  // Ensure legacy alias after handleHeaderToggle useCallback
  if (!code.includes('const toggleSort = handleHeaderToggle')) {
    const m = code.match(/\}\s*,\s*\[\s*setView\s*\]\s*\);/);
    const alias = "\n  const toggleSort = handleHeaderToggle; // legacy alias to guard against stale calls\n";
    if (m) code = code.replace(m[0], m[0] + alias);
    else code = code.replace(/function Board\s*\(\)\s*\{/, m => m + "\n  " + alias.trim() + "\n");
  }

  if (code !== before) {
    fs.writeFileSync(file, code, 'utf8');
    console.log('[hotfix] Updated', path.relative(ROOT, file));
  } else {
    console.log('[hotfix] No changes needed for', path.relative(ROOT, file));
  }
}

run();
