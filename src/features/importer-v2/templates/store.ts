/**
 * Template storage and management for Importer V2
 * Handles template CRUD operations and auto-detection
 */

import { db } from '../../../data/db';
import type { 
  ImportTemplate, 
  TemplateMatchResult, 
  TemplateSearchQuery,
  TemplateMetadata,
  TemplateUsage,
  TemplateExport,
  TemplateImport
} from './types';
import { normalizeHeader } from '../core/normalize';
import { findBestMappings } from '../core/score';

const TEMPLATE_PREFIX = 'importer_v2_template_';
const USAGE_PREFIX = 'importer_v2_usage_';

/**
 * Template store singleton
 */
class TemplateStore {
  private cache: Map<string, ImportTemplate> = new Map();
  private initialized = false;

  /**
   * Initialize store with built-in templates
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load user templates from storage
      const keys = await db.kv.where('key').startsWith(TEMPLATE_PREFIX).primaryKeys();
      
      for (const key of keys) {
        try {
          const data = await db.getKV(key as string);
          if (data) {
            const template: ImportTemplate = JSON.parse(new TextDecoder().decode(data as any));
            this.cache.set(template.metadata.id, template);
          }
        } catch (error) {
          console.warn(`Failed to load template ${key}:`, error);
        }
      }
      
      // Create built-in system templates if none exist
      if (this.cache.size === 0) {
        await this.createBuiltInTemplates();
      }
      
      this.initialized = true;
      console.log(`✅ Template store initialized with ${this.cache.size} templates`);
      
    } catch (error) {
      console.error('❌ Template store initialization failed:', error);
      this.initialized = true; // Don't retry
    }
  }

  /**
   * Create built-in system templates
   */
  private async createBuiltInTemplates(): Promise<void> {
    const systemTemplates: ImportTemplate[] = [
      {
        metadata: {
          id: 'ams-standard',
          name: 'AMS Standard Export',
          description: 'Standardvorlage für AMS-Exporte mit typischen Spalten',
          version: '1.0',
          category: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
          tags: ['ams', 'standard', 'export']
        },
        detection: {
          fileNamePatterns: ['*ams*', '*export*', '*kunden*'],
          headerPatterns: ['ams', 'vorname', 'nachname'],
          confidence: 0.7
        },
        columnMappings: {
          '0': 'amsId',
          '1': 'firstName',
          '2': 'lastName',
          '3': 'birthDate',
          '4': 'phone',
          '5': 'email',
          '6': 'address',
          '7': 'status',
          '8': 'amsAdvisor'
        },
        transformOptions: {
          dateFormat: 'dd.mm.yyyy',
          phoneFormat: 'combined',
          genderMapping: {
            'm': 'M',
            'w': 'F',
            'd': 'D',
            'männlich': 'M',
            'weiblich': 'F',
            'divers': 'D'
          }
        }
      },
      
      {
        metadata: {
          id: 'minimal-contact',
          name: 'Minimal Kontaktliste',
          description: 'Einfache Vorlage für Kontaktlisten mit Namen und Telefon',
          version: '1.0',
          category: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
          tags: ['kontakt', 'minimal', 'einfach']
        },
        detection: {
          headerPatterns: ['name', 'telefon'],
          confidence: 0.6
        },
        columnMappings: {
          '0': 'firstName',
          '1': 'lastName',
          '2': 'phone',
          '3': 'email'
        },
        transformOptions: {
          phoneFormat: 'combined'
        }
      }
    ];

    for (const template of systemTemplates) {
      await this.saveTemplate(template);
    }
  }

  /**
   * Find templates matching the given criteria
   */
  async findMatchingTemplates(
    query: TemplateSearchQuery
  ): Promise<TemplateMatchResult[]> {
    await this.initialize();
    
    const results: TemplateMatchResult[] = [];
    
    for (const template of this.cache.values()) {
      const matchResult = this.calculateTemplateMatch(template, query);
      if (matchResult.confidence > 0.3) {
        results.push(matchResult);
      }
    }
    
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate how well a template matches the query
   */
  private calculateTemplateMatch(
    template: ImportTemplate,
    query: TemplateSearchQuery
  ): TemplateMatchResult {
    let confidence = 0;
    const reasons: string[] = [];
    const matchedPatterns: TemplateMatchResult['matchedPatterns'] = {};

    // File name matching
    if (query.fileName && template.detection.fileNamePatterns) {
      const fileName = query.fileName.toLowerCase();
      const matchingPatterns = template.detection.fileNamePatterns.filter(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        return regex.test(fileName);
      });
      
      if (matchingPatterns.length > 0) {
        confidence += 0.3;
        reasons.push(`Dateiname passt zu ${matchingPatterns.length} Mustern`);
        matchedPatterns.fileName = true;
      }
    }

    // Header matching
    if (query.headers && template.detection.headerPatterns) {
      const normalizedQueryHeaders = query.headers.map(h => normalizeHeader(h).fixed);
      const matchingHeaders: string[] = [];
      
      for (const pattern of template.detection.headerPatterns) {
        const normalizedPattern = normalizeHeader(pattern).fixed;
        if (normalizedQueryHeaders.some(h => h.includes(normalizedPattern))) {
          matchingHeaders.push(pattern);
        }
      }
      
      if (matchingHeaders.length > 0) {
        const headerMatchRatio = matchingHeaders.length / template.detection.headerPatterns.length;
        confidence += 0.5 * headerMatchRatio;
        reasons.push(`${matchingHeaders.length}/${template.detection.headerPatterns.length} Header-Muster gefunden`);
        matchedPatterns.headers = matchingHeaders;
      }
    }

    // Content hints matching
    if (query.sampleData && template.detection.contentHints) {
      // TODO: Implement content matching
      // For now, just add small bonus for having content hints
      confidence += 0.1;
      reasons.push('Template hat Content-Hints definiert');
    }

    return {
      template,
      confidence: Math.min(1.0, confidence),
      reasons,
      matchedPatterns
    };
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<ImportTemplate | null> {
    await this.initialize();
    return this.cache.get(id) || null;
  }

  /**
   * Save or update template
   */
  async saveTemplate(template: ImportTemplate): Promise<void> {
    await this.initialize();
    
    try {
      // Update metadata
      template.metadata.updatedAt = new Date().toISOString();
      if (!template.metadata.createdAt) {
        template.metadata.createdAt = template.metadata.updatedAt;
      }
      
      // Persist to storage
      const key = `${TEMPLATE_PREFIX}${template.metadata.id}`;
      const data = new TextEncoder().encode(JSON.stringify(template));
      await db.setKV(key, data);
      
      // Update cache
      this.cache.set(template.metadata.id, template);
      
      console.log(`✅ Template saved: ${template.metadata.name}`);
      
    } catch (error) {
      console.error('❌ Failed to save template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    await this.initialize();
    
    try {
      const template = this.cache.get(id);
      if (!template) return false;
      
      // Don't delete system templates
      if (template.metadata.category === 'system') {
        throw new Error('System-Vorlagen können nicht gelöscht werden');
      }
      
      // Remove from storage
      const key = `${TEMPLATE_PREFIX}${id}`;
      await db.kv.delete(key);
      
      // Remove from cache
      this.cache.delete(id);
      
      console.log(`✅ Template deleted: ${template.metadata.name}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      throw error;
    }
  }

  /**
   * List all templates with optional filtering
   */
  async listTemplates(filter?: {
    category?: 'system' | 'user' | 'shared';
    tags?: string[];
    search?: string;
  }): Promise<ImportTemplate[]> {
    await this.initialize();
    
    let templates = Array.from(this.cache.values());
    
    if (filter) {
      if (filter.category) {
        templates = templates.filter(t => t.metadata.category === filter.category);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        templates = templates.filter(t => 
          t.metadata.tags?.some(tag => filter.tags!.includes(tag))
        );
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        templates = templates.filter(t => 
          t.metadata.name.toLowerCase().includes(searchLower) ||
          t.metadata.description?.toLowerCase().includes(searchLower) ||
          t.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
    }
    
    // Sort by usage count and last used
    return templates.sort((a, b) => {
      const aUsage = a.metadata.usageCount || 0;
      const bUsage = b.metadata.usageCount || 0;
      if (aUsage !== bUsage) return bUsage - aUsage;
      
      const aLastUsed = a.metadata.lastUsed ? new Date(a.metadata.lastUsed).getTime() : 0;
      const bLastUsed = b.metadata.lastUsed ? new Date(b.metadata.lastUsed).getTime() : 0;
      return bLastUsed - aLastUsed;
    });
  }

  /**
   * Auto-detect best template for import data
   */
  async autoDetectTemplate(
    filename: string,
    headers: string[],
    sampleRows?: string[][]
  ): Promise<TemplateMatchResult | null> {
    const query: TemplateSearchQuery = {
      fileName: filename,
      headers,
      sampleData: sampleRows
    };
    
    const matches = await this.findMatchingTemplates(query);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Create template from current mapping
   */
  async createTemplateFromMapping(
    name: string,
    description: string,
    mappings: Record<string, InternalField>,
    detectionHints: {
      fileName?: string;
      headers: string[];
    }
  ): Promise<ImportTemplate> {
    const template: ImportTemplate = {
      metadata: {
        id: crypto.randomUUID(),
        name,
        description,
        version: '1.0',
        category: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        tags: []
      },
      detection: {
        headerPatterns: detectionHints.headers.slice(0, 5), // First 5 headers
        confidence: 0.6
      },
      columnMappings: mappings
    };
    
    await this.saveTemplate(template);
    return template;
  }

  /**
   * Record template usage for analytics
   */
  async recordTemplateUsage(
    templateId: string,
    usage: Omit<TemplateUsage, 'templateId'>
  ): Promise<void> {
    try {
      // Save usage record
      const usageKey = `${USAGE_PREFIX}${templateId}_${Date.now()}`;
      const usageData = new TextEncoder().encode(JSON.stringify({ templateId, ...usage }));
      await db.setKV(usageKey, usageData);
      
      // Update template usage count and last used
      const template = await this.getTemplate(templateId);
      if (template) {
        template.metadata.usageCount = (template.metadata.usageCount || 0) + 1;
        template.metadata.lastUsed = new Date().toISOString();
        await this.saveTemplate(template);
      }
      
    } catch (error) {
      console.warn('Failed to record template usage:', error);
    }
  }

  /**
   * Export templates to JSON
   */
  async exportTemplates(templateIds?: string[]): Promise<TemplateExport> {
    await this.initialize();
    
    const templatesToExport = templateIds 
      ? templateIds.map(id => this.cache.get(id)).filter(Boolean) as ImportTemplate[]
      : Array.from(this.cache.values()).filter(t => t.metadata.category === 'user');
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: templatesToExport,
      metadata: {
        description: 'Importer V2 Template Export',
        compatibility: ['1.0']
      }
    };
  }

  /**
   * Import templates from JSON
   */
  async importTemplates(exportData: TemplateExport): Promise<TemplateImport> {
    await this.initialize();
    
    const conflicts: TemplateImport['conflicts'] = [];
    const importedTemplates: ImportTemplate[] = [];
    
    for (const template of exportData.templates) {
      const existing = this.cache.get(template.metadata.id);
      
      if (existing) {
        conflicts.push({
          templateId: template.metadata.id,
          existingName: existing.metadata.name,
          importedName: template.metadata.name,
          resolution: 'skip' // Default resolution
        });
      } else {
        // Import new template
        template.metadata.category = 'user'; // Imported templates are user templates
        await this.saveTemplate(template);
        importedTemplates.push(template);
      }
    }
    
    return {
      templates: importedTemplates,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(templateId: string): Promise<TemplateUsage[]> {
    try {
      const usageKeys = await db.kv.where('key').startsWith(`${USAGE_PREFIX}${templateId}_`).primaryKeys();
      const usageRecords: TemplateUsage[] = [];
      
      for (const key of usageKeys) {
        try {
          const data = await db.getKV(key as string);
          if (data) {
            const usage: TemplateUsage = JSON.parse(new TextDecoder().decode(data as any));
            usageRecords.push(usage);
          }
        } catch (error) {
          console.warn(`Failed to load usage record ${key}:`, error);
        }
      }
      
      return usageRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
    } catch (error) {
      console.warn('Failed to get template usage:', error);
      return [];
    }
  }

  /**
   * Clear cache and reload from storage
   */
  async refresh(): Promise<void> {
    this.cache.clear();
    this.initialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const templateStore = new TemplateStore();

// Initialize on first import
templateStore.initialize().catch(console.error);