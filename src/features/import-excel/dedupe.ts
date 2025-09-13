/**
 * Deduplizierung und Hashing für Delta-Sync
 */
import { normalize } from '../../utils/normalize';
import { parseToISO } from '../../utils/date';
import CryptoJS from 'crypto-js';
import type { ImportRawRow } from './types';

const toISOIfFilled = (value: unknown): string | undefined => {
  const s = value == null ? '' : String(value).trim();
  if (!s) return undefined;
  try {
    return parseToISO(s);
  } catch {
    return undefined;
  }
};

export function buildRowKey(row: ImportRawRow): string {
  // Primär: amsId
  if (row.amsId?.trim()) {
    return row.amsId.trim().toUpperCase();
  }
  
  // Fallback: normalisierter Name + Geburtsdatum
  const firstName = normalize(row.firstName || '');
  const lastName = normalize(row.lastName || '');
  const birthDate = toISOIfFilled(row.birthDate) || '';
  
  return `${firstName}${lastName}#${birthDate}`;
}

export function hashRow(row: ImportRawRow): string {
  // Nur importrelevante Felder für Hash verwenden
  const relevantFields: Record<string, string> = {
    amsId: row.amsId || '',
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    birthDate: toISOIfFilled(row.birthDate) || row.birthDate || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    internalCode: row.internalCode || '',
    priority: row.priority || '',
    status: row.status || '',
    followUp: toISOIfFilled(row.followUp) || String(row.followUp || '')
  };
  
  const json = JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
  return CryptoJS.SHA256(json).toString();
}

export function dedupeImport<T extends Record<string, unknown>>(rows: T[]): {
  dedupedRows: T[]; 
  duplicates: Array<{ indices: number[]; key: string; reason: string }> 
} {
  // Simple deduplication by row key
  const seen = new Map<string, number>();
  const duplicates: Array<{ indices: number[]; key: string; reason: string }> = [];
  const dedupedRows: T[] = [];
  
  rows.forEach((row, index) => {
    const key = buildRowKey(row as any);
    const firstIndex = seen.get(key);
    
    if (firstIndex !== undefined) {
      // Find existing duplicate group or create new one
      let duplicateGroup = duplicates.find(d => d.key === key);
      if (!duplicateGroup) {
        duplicateGroup = { indices: [firstIndex], key, reason: 'Same row key' };
        duplicates.push(duplicateGroup);
      }
      duplicateGroup.indices.push(index);
    } else {
      seen.set(key, index);
      dedupedRows.push(row);
    }
  });
  
  return { dedupedRows, duplicates };
}