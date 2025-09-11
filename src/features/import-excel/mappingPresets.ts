/**
 * Mapping-Presets für Excel-Import
 */
import { db } from '../../data/db';

export interface MappingPreset {
  sourceId: string;
  mapping: Record<string, string>;
  createdAt: string;
}

const PREFIX = 'mapping_preset_';

export async function savePreset(sourceId: string, mapping: Record<string, string>): Promise<void> {
  const key = `${PREFIX}${sourceId}`;
  const preset: MappingPreset = {
    sourceId,
    mapping,
    createdAt: new Date().toISOString()
  };
  const data = new TextEncoder().encode(JSON.stringify(preset));
  await db.setKV(key, data);
  console.log(`💾 Mapping preset saved for: ${sourceId}`);
}

export async function loadPreset(sourceId: string): Promise<Record<string, string> | null> {
  const key = `${PREFIX}${sourceId}`;
  try {
    const data = await db.getKV(key);
    if (!data) return null;
    const preset: MappingPreset = JSON.parse(new TextDecoder().decode(data));
    console.log(`📂 Mapping preset loaded for: ${sourceId}`);
    return preset.mapping;
  } catch (error) {
    console.warn(`⚠️ Failed to load preset for ${sourceId}:`, error);
    return null;
  }
}

export async function listPresets(): Promise<string[]> {
  const keys = await db.kv.where('key').startsWith(PREFIX).primaryKeys();
  return (keys as string[]).map(k => k.replace(PREFIX, ''));
}
