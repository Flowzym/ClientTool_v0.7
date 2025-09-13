/**
 * Deduplizierung und Hashing für Delta-Sync
 */
import { normalize } from '../../utils/normalize';
import { parseToISO } from '../../utils/date';
import CryptoJS from 'crypto-js';

const toISOIfFilled = (value: unknown): string | undefined => {
  const s = value == null ? '' : String(value).trim();
  if (!s) return undefined;
  try {
    return parseToISO(s);
  } catch {
    return undefined;
  }
};

export function buildRowKey(row: any): string {
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

export function hashRow(row: any): string {
  // Nur importrelevante Felder für Hash verwenden
  const relevantFields = {
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
    followUp: toISOIfFilled(row.followUp) || row.followUp || ''
  };
  
  const json = JSON.stringify(relevantFields, Object.keys(relevantFields).sort());
  return CryptoJS.SHA256(json).toString();
}