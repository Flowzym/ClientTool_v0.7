\
#!/usr/bin/env node
/**
 * Patch Board.tsx to add a local sorting fallback and prevent setView crashes.
 * Idempotent, conservative text edits.
 */
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

function insertAfter(haystack, anchorRegex, insertion) {
  const m = haystack.match(anchorRegex);
  if (!m) return haystack;
  const idx = m.index + m[0].length;
  return haystack.slice(0, idx) + insertion + haystack.slice(idx);
}

function run() {
  const file = pick();
  if (!file) {
    console.error('[patch] Board.tsx not found in known paths:', CANDIDATES);
    process.exit(2);
  }
  let code = fs.readFileSync(file, 'utf8');
  let before = code;

  // 1) Ensure local sort state exists
  if (!/const \\[localSort,\\s*setLocalSort\\]/.test(code)) {
    // place after the virtualRowsEnabled state
    const anchor = /const \\[virtualRowsEnabled[^;]+;\\s*/;
    const insertion = "\n  const [localSort, setLocalSort] = useState<{ key: string | null; direction: 'asc' | 'desc' | null } | null>(null);\n";
    code = insertAfter(code, anchor, insertion);
  }

  // 2) Define sortState and sortedClients (if not present)
  if (!/const\\s+sortState\\s*=/.test(code)) {
    const anchor = /const selectedSet = useMemo\\([^\\)]*\\);\\s*\\n\\s*const allIds = useMemo\\(/;
    const insertion = "\n  const sortState = localSort ?? (view?.sort ?? { key: null, direction: null });\n";
    code = insertAfter(code, anchor, insertion);
  }

  if (!/const\\s+sortedClients\\s*=/.test(code)) {
    // Insert sorter helper and memo before "Derived values" or before the first return
    const helper =
`\n  // Local sort helper (pinned first → active column → id)\\n\
  const formatNameForSort = (c:any) => {\\n\
    const last = c.lastName ?? '';\\n\
    const first = c.firstName ?? '';\\n\
    const title = c.title ? \\` (\\${'c.title'})\\` : '';\\n\
    const fallback = c.name ?? '' ;\\n\
    const composed = (last || first) ? \\`\${last}, \${first}\${title}\\` : fallback;\\n\
    return composed;\\n\
  };\\n\
  const getPinned = (c:any) => Boolean(c.isPinned ?? c.pinned ?? false);\\n\
  const cmpStr = (a:string, b:string) => a.localeCompare(b, 'de', { sensitivity: 'base' });\\n\
  const cmpDate = (a:string|null, b:string|null) => {\\n\
    if (!a && !b) return 0; if (!a) return 1; if (!b) return -1;\\n\
    return (a < b) ? -1 : (a > b ? 1 : 0);\\n\
  };\\n\
  const sortClients = (list:any[], sort:{ key:string|null; direction:'asc'|'desc'|null }) => {\\n\
    const dir = sort?.direction === 'desc' ? -1 : 1;\\n\
    const key = sort?.key;\\n\
    const arr = [...list];\\n\
    arr.sort((a,b) => {\\n\
      // pinned first\\n\
      const pa = getPinned(a), pb = getPinned(b);\\n\
      if (pa !== pb) return pa ? -1 : 1;\\n\
      // active column\\n\
      if (!key) return (String(a.id).localeCompare(String(b.id)));\\n\
      let delta = 0;\\n\
      switch (key) {\\n\
        case 'name': delta = cmpStr(formatNameForSort(a), formatNameForSort(b)); break;\\n\
        case 'offer': delta = cmpStr(String(a.offer ?? ''), String(b.offer ?? '')); break;\\n\
        case 'status': delta = cmpStr(String(a.status ?? ''), String(b.status ?? '')); break;\\n\
        case 'result': delta = cmpStr(String(a.result ?? ''), String(b.result ?? '')); break;\\n\
        case 'followUp': delta = cmpDate(a.followUp ?? null, b.followUp ?? null); break;\\n\
        case 'assignedTo': delta = cmpStr(String(a.assignedTo ?? ''), String(b.assignedTo ?? '')); break;\\n\
        case 'contacts': delta = (Number(a.contactCount ?? 0) - Number(b.contactCount ?? 0)); break;\\n\
        case 'notes': delta = (Number(a.noteCount ?? a.notesCount ?? 0) - Number(b.noteCount ?? b.notesCount ?? 0)); break;\\n\
        case 'priority': delta = (Number(a.priority ?? 0) - Number(b.priority ?? 0)); break;\\n\
        case 'activity': delta = cmpDate(a.lastActivity ?? null, b.lastActivity ?? null); break;\\n\
        default: delta = 0;\\n\
      }\\n\
      if (delta !== 0) return dir * (delta < 0 ? -1 : delta > 0 ? 1 : 0);\\n\
      // tiebreaker id\\n\
      return String(a.id).localeCompare(String(b.id));\\n\
    });\\n\
    return arr;\\n\
  };\\n\
  const sortedClients = useMemo(() => sortClients(visibleClients, sortState), [visibleClients, sortState]);\\n`;
    // Insert before the comment "Subscribe to feature flag changes" or before first useEffect
    const anchor = /\/\/ Subscribe to feature flag changes|useEffect\\s*\\(/;
    code = insertAfter(code, anchor, helper);
  }

  // 3) Harden handleHeaderToggle: support lack of setView
  code = code.replace(
    /const\\s+handleHeaderToggle\\s*=\\s*useCallback\\([^]*?\\)\\s*;\\s*/m,
    (m) => {
      // Replace entire declaration with our hardened version
      return `const handleHeaderToggle = useCallback((key: string) => {
    const cycle = (prevSort: any) => {
      if (prevSort?.key !== key) return { key, direction: 'asc' as const };
      if (prevSort?.direction === 'asc') return { key, direction: 'desc' as const };
      return { key: null, direction: null };
    };
    try {
      if (typeof setView === 'function') {
        setView((prev: any) => ({ ...prev, sort: cycle(prev?.sort) }));
      } else {
        // fallback: local sort state
        setLocalSort((prev) => cycle(prev ?? (view?.sort ?? { key: null, direction: null })));
      }
    } catch (err) {
      console.warn('[Board] setView not functional — using local sort fallback.', err);
      setLocalSort((prev) => cycle(prev ?? (view?.sort ?? { key: null, direction: null })));
    }
  }, [setView, view]);\n`;
    }
  );

  // 4) Replace header bindings: view.sort → sortState
  code = code.replace(/view\\.sort\\./g, 'sortState.');

  // 5) Feed sortedClients to lists
  code = code.replace(/clients=\\{visibleClients\\}/g, 'clients={sortedClients}');

  // 6) Provide legacy alias for toggleSort if any remains
  if (!code.includes('const toggleSort = handleHeaderToggle')) {
    const alias = '  const toggleSort = handleHeaderToggle; // legacy alias for stale calls\\n';
    if (/const\\s+handleHeaderToggle\\s*=/.test(code)) {
      code = code.replace(/const\\s+handleHeaderToggle[\\s\\S]*?\\n\\}\\s*,\\s*\\[.*?\\]\\);/, (block) => block + '\\n' + alias);
    } else {
      code = code.replace(/function Board\\s*\\(\\)\\s*\\{/, (m) => m + '\\n' + alias);
    }
  }

  if (code !== before) {
    fs.writeFileSync(file, code, 'utf8');
    console.log('[patch] Updated', path.relative(ROOT, file));
  } else {
    console.log('[patch] No changes necessary for', path.relative(ROOT, file));
  }
}

run();
