*** a/src/features/import-excel/validators.ts
--- b/src/features/import-excel/validators.ts
@@
 import { safeParseToISO } from '../../utils/date/safeParseToISO';
 
 export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };
 
 /**
  * Minimal validation used by ImportExcel.tsx
  * - Ensures required "name" is present
  * - Tries to parse an optional "followUp" date permissively
  */
 export function validateRow(row: Record<string, unknown>): ValidationResult {
   const errors: string[] = [];
   const warnings: string[] = [];
 
   // required
   const name = String(row.name ?? '').trim();
   if (!name) errors.push('Missing required field: name');
-...
-  // followUp (optional) — permissive parse
-  const followUp = row.followUp;
-  if (followUp != null && String(followUp).trim()) {
-    try {
-      // rewrite to ISO if possible
-      (row as any).followUp = safeParseToISO(String(followUp)) || String(followUp);
-    return safeParseToISO(input);
-      warnings.push('Could not parse follow-up date');
-    }
-  }
-
-  return { ok: errors.length === 0, errors, warnings };
-}
-
-export { dedupeImport } from './dedupe';
+  // followUp (optional) — permissive parse
+  const followUp = (row as any).followUp;
+  if (followUp != null && String(followUp).trim()) {
+    try {
+      const iso = safeParseToISO(String(followUp));
+      if (iso) {
+        (row as any).followUp = iso;
+      } else {
+        warnings.push('Could not parse follow-up date');
+      }
+    } catch {
+      warnings.push('Could not parse follow-up date');
+    }
+  }
+
+  return { ok: errors.length === 0, errors, warnings };
+}
+
+export { dedupeImport } from './dedupe';
