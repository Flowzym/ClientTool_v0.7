@@ .. @@
 /**
  * Importer V2 barrel exports
  * Enhanced import pipeline with intelligent mapping
  */
 
-// TODO: Export main components when implemented
-export const IMPORTER_V2_PLACEHOLDER = true;
+// Core functionality
+export * from './core/types';
+export * from './core/normalize';
+export * from './core/aliases';
+export * from './core/score';
+export * from './core/detect';
+export * from './core/validate';
+
+// Template system
+export * from './templates/types';
+export * from './templates/store';
+
+// UI Components
+export { MappingWizard } from './ui/MappingWizard';
+export { MappingTable } from './ui/MappingTable';
+export { ColumnSelect } from './ui/ColumnSelect';
+export { CustomFieldEditor } from './ui/CustomFieldEditor';
+export { TemplateBar } from './ui/TemplateBar';
+export { PreviewPane } from './ui/PreviewPane';