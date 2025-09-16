/**
 * Template persistence for mapping configurations
 * Stores templates in IndexedDB for offline access
 */

import { db } from '../../data/db';
import type { ImportTemplate } from '../core/types';
import type { TemplateMetadata } from './types';

const TEMPLATE_PREFIX = 'import_template_v2_';

/**
 * Save a mapping template
 */
export async function saveTemplate(template: ImportTemplate): Promise<void> {
  const key = `${TEMPLATE_PREFIX}${template.metadata.id}`;
  const data = new TextEncoder().encode(JSON.stringify(template));
  
  try {
    await db.setKV(key, data);
    console.log(`💾 Template saved: ${template.metadata.name}`);
  } catch (error) {
    console.error('❌ Failed to save template:', error);
    throw new Error('Template konnte nicht gespeichert werden');
  }
}

/**
 * Load a specific template by ID
 */
export async function loadTemplate(templateId: string): Promise<ImportTemplate | null> {
  const key = `${TEMPLATE_PREFIX}${templateId}`;
  
  try {
    const data = await db.getKV(key);
    if (!data) return null;
    
    const template: ImportTemplate = JSON.parse(new TextDecoder().decode(data));
    console.log(`📂 Template loaded: ${template.metadata.name}`);
    return template;
  } catch (error) {
    console.error('❌ Failed to load template:', error);
    return null;
  }
}

/**
 * List all available templates (metadata only)
 */
export async function listTemplates(): Promise<TemplateMetadata[]> {
  try {
    // Get all keys starting with template prefix
    const allKeys = await db.kv.where('key').startsWith(TEMPLATE_PREFIX).primaryKeys();
    const templateKeys = (allKeys as string[]).filter(key => key.startsWith(TEMPLATE_PREFIX));
    
    const templates: TemplateMetadata[] = [];
    
    for (const key of templateKeys) {
      try {
        const data = await db.getKV(key);
        if (data) {
          const template: ImportTemplate = JSON.parse(new TextDecoder().decode(data));
          templates.push(template.metadata);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load template metadata for ${key}:`, error);
      }
    }
    
    // Sort by creation date (newest first)
    templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return templates;
  } catch (error) {
    console.error('❌ Failed to list templates:', error);
    return [];
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const key = `${TEMPLATE_PREFIX}${templateId}`;
  
  try {
    await db.kv.delete(key);
    console.log(`🗑️ Template deleted: ${templateId}`);
  } catch (error) {
    console.error('❌ Failed to delete template:', error);
    throw new Error('Template konnte nicht gelöscht werden');
  }
}

/**
 * Export template as JSON string
 */
export async function exportTemplate(templateId: string): Promise<string | null> {
  const template = await loadTemplate(templateId);
  if (!template) return null;
  
  return JSON.stringify(template, null, 2);
}

/**
 * Import template from JSON string
 */
export async function importTemplate(jsonString: string): Promise<ImportTemplate> {
  try {
    const template: ImportTemplate = JSON.parse(jsonString);
    
    // Validate template structure
    if (!template.metadata || !template.mapping) {
      throw new Error('Ungültiges Template-Format');
    }
    
    // Generate new ID to avoid conflicts
    template.metadata.id = `imported_${Date.now()}`;
    template.metadata.createdAt = new Date().toISOString();
    
    await saveTemplate(template);
    return template;
  } catch (error) {
    console.error('❌ Failed to import template:', error);
    throw new Error('Template konnte nicht importiert werden');
  }
}

/**
 * Get template usage statistics
 */
export async function getTemplateStats(): Promise<{
  totalTemplates: number;
  totalMappings: number;
  totalCustomFields: number;
  oldestTemplate?: string;
  newestTemplate?: string;
}> {
  const templates = await listTemplates();
  
  const stats = {
    totalTemplates: templates.length,
    totalMappings: templates.reduce((sum, t) => sum + t.fieldCount, 0),
    totalCustomFields: templates.reduce((sum, t) => sum + t.customFieldCount, 0),
    oldestTemplate: templates.length > 0 ? templates[templates.length - 1].createdAt : undefined,
    newestTemplate: templates.length > 0 ? templates[0].createdAt : undefined
  };
  
  return stats;
}

/**
 * Clean up old templates (keep only last N)
 */
export async function cleanupOldTemplates(keepCount: number = 20): Promise<number> {
  const templates = await listTemplates();
  
  if (templates.length <= keepCount) return 0;
  
  const toDelete = templates.slice(keepCount);
  let deleted = 0;
  
  for (const template of toDelete) {
    try {
      await deleteTemplate(template.id);
      deleted++;
    } catch (error) {
      console.warn(`⚠️ Failed to delete old template ${template.id}:`, error);
    }
  }
  
  console.log(`🧹 Cleaned up ${deleted} old templates`);
  return deleted;
}