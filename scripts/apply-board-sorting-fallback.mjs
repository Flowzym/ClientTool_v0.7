
// CommonJS safe patcher (Node >=14)
const fs = require('fs');
const path = require('path');

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

function insertAfterFirst(code, regex, insertion) {
  const m = code.match(regex);
  if (!m) return code;
  const idx = m.index + m[0].length;
  return code.slice(0, idx) + insertion + code.slice(idx);
}

function ensureLocalSort(code) {
  if (/const\s*\[\s*localSort\s*,\s*setLocalSort\s*\]/.test(code)) return code;
  let anchor = /const\s*\[\s*virtualRowsEnabled[\s\S]*?;[\t ]*\n/;
  if (!anchor.test(code)) anchor = /const\s*\[\s*selectedIds[\s\S]*?;[\t ]*\n/;
  const insertion = "\n  const [localSort, setLocalSort] = useState({ key: null, direction: null });\n";
  return insertAfterFirst(code, anchor, insertion);
}

function ensureSortState(code) {
  if (/const\s+sortState\s*=/.test(code)) return code;
  const anchor = /const\s+allIds\s*=\s*useMemo\([\s\S]*?\);\s*\n/;
  const insertion = "  const sortState = (localSort && (localSort.key !== null || localSort.direction !== null)) ? localSort : (view && view.sort ? view.sort : { key: null, direction: null });\n";
  return insertAfterFirst(code, anchor, insertion);
}

function ensureSorterAndSortedClients(code) {
  if (/const\s+sortedClients\s*=/.test(code)) return code;
  const insertion = `
  // Sort helper: pinned first -> active column -> id
  const _formatName = (c) => {
    const last = c.lastName || '';
    const first = c.firstName || '';
    const title = c.title ? ' (' + c.title + ')' : '';
    const fallback = c.name || '';
    return (last || first) ? (last + ', ' + first + title) : fallback;
  };
  const _getPinned = (c) => !!(c.isPinned ?? c.pinned ?? false);
  const _cmpStr = (a, b) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base' });
  const _cmpNum = (a, b) => (Number(a) - Number(b));
  const _cmpDate = (a, b) => {
    const A = a || null, B = b || null;
    if (!A && !B) return 0; if (!A) return 1; if (!B) return -1;
    if (A < B) return -1; if (A > B) return 1; return 0;
  };
  const _sortClients = (list, sort) => {
    const dir = (sort && sort.direction === 'desc') ? -1 : 1;
    const key = sort ? sort.key : null;
    const arr = list.slice();
    arr.sort((a,b) => {
      const pa = _getPinned(a), pb = _getPinned(b);
      if (pa !== pb) return pa ? -1 : 1;
      let d = 0;
      switch (key) {
        case 'name': d = _cmpStr(_formatName(a), _formatName(b)); break;
        case 'offer': d = _cmpStr(a.offer ?? '', b.offer ?? ''); break;
        case 'status': d = _cmpStr(a.status ?? '', b.status ?? ''); break;
        case 'result': d = _cmpStr(a.result ?? '', b.result ?? ''); break;
        case 'followUp': d = _cmpDate(a.followUp ?? null, b.followUp ?? null); break;
        case 'assignedTo': d = _cmpStr(a.assignedTo ?? '', b.assignedTo ?? ''); break;
        case 'contacts': d = _cmpNum(a.contactCount ?? 0, b.contactCount ?? 0); break;
        case 'notes': d = _cmpNum((a.noteCount ?? a.notesCount ?? 0), (b.noteCount ?? b.notesCount ?? 0)); break;
        case 'priority': d = _cmpNum(a.priority ?? 0, b.priority ?? 0); break;
        case 'activity': d = _cmpDate(a.lastActivity ?? null, b.lastActivity ?? null); break;
        default: d = 0;
      }
      if (d !== 0) return dir * (d < 0 ? -1 : 1);
      return String(a.id).localeCompare(String(b.id));
    });
    return arr;
  };
  const sortedClients = useMemo(() => _sortClients(visibleClients, sortState), [visibleClients, sortState]);
`;
  // insert before first useEffect or subscription comment
  let anchor = /useEffect\s*\(/;
  if (!anchor.test(code)) anchor = /\/\/\s*Subscribe to feature flag changes/;
  return insertAfterFirst(code, anchor, insertion);
}

function ensureSetViewShim(code) {
  if (/_setView\s*\(/.test(code) || /function\s+_setView/.test(code) || /const\s+_setView\s*=/.test(code)) return code;
  const insertion = `
  // Safe shim around setView: uses setView if callable, otherwise updates localSort
  const _cycleSort = (prevSort, key) => {
    if (!prevSort || prevSort.key !== key) return { key, direction: 'asc' };
    if (prevSort.direction === 'asc') return { key, direction: 'desc' };
    return { key: null, direction: null };
  };
  const _setView = (update) => {
    try {
      if (typeof setView === 'function') return setView(update);
    } catch (_) {}
    // fallback path: only care about sort updates
    try {
      const current = (view && view.sort) ? view.sort : localSort;
      const next = (typeof update === 'function') ? update({ sort: current }) : update;
      if (next && next.sort) setLocalSort(next.sort);
    } catch (_) {}
  };
`;
  // put after localSort declaration
  const anchor = /const\s*\[\s*localSort\s*,\s*setLocalSort\s*\][\s\S]*?;\s*\n/;
  return insertAfterFirst(code, anchor, insertion);
}

function replaceSetViewCalls(code) {
  return code.replace(/(?<!_)setView\(/g, '_setView(');
}

function swapViewSortBindings(code) {
  return code.replace(/view\.sort\./g, 'sortState.');
}

function useSortedClients(code) {
  return code.replace(/clients=\{visibleClients\}/g, 'clients={sortedClients}');
}

function ensureLegacyAlias(code) {
  if (/const\s+toggleSort\s*=\s*handleHeaderToggle/.test(code)) return code;
  return code.replace(/function\s+Board\s*\(\)\s*\{/, (m) => m + "\n  const toggleSort = handleHeaderToggle; // legacy alias for stale calls\n");
}

function run() {
  const file = pick();
  if (!file) {
    console.error('[patch] Board.tsx not found in known paths:', CANDIDATES);
    process.exit(2);
  }
  let code = fs.readFileSync(file, 'utf8');
  let before = code;

  code = ensureLocalSort(code);
  code = ensureSortState(code);
  code = ensureSorterAndSortedClients(code);
  code = ensureSetViewShim(code);
  code = replaceSetViewCalls(code);
  code = swapViewSortBindings(code);
  code = useSortedClients(code);
  code = ensureLegacyAlias(code);

  if (code !== before) {
    fs.writeFileSync(file, code, 'utf8');
    console.log('[patch] Updated', path.relative(ROOT, file));
  } else {
    console.log('[patch] No changes necessary for', path.relative(ROOT, file));
  }
}

run();
