/**
 * Magic-Number-Erkennung für Dateiformate
 */

export type FileType = 'xlsx' | 'xls' | 'csv' | 'html' | 'unknown';

export function sniffBuffer(arrayBuffer: ArrayBuffer, fileName: string, mimeType?: string): FileType {
  const ext = (fileName?.split('.').pop() || '').toLowerCase();
  
  // HTML über MIME-Type erkennen
  if (mimeType && /text\/html/i.test(mimeType)) {
    return 'html';
  }
  
  const u8 = new Uint8Array(arrayBuffer);
  
  // XLSX (ZIP-Format): 50 4B 03 04 (PK..)
  if (u8.length >= 4 && 
      u8[0] === 0x50 && u8[1] === 0x4B && 
      u8[2] === 0x03 && u8[3] === 0x04) {
    return 'xlsx';
  }
  
  // XLS (OLE CFB): D0 CF 11 E0 A1 B1 1A E1
  if (u8.length >= 8 && 
      u8[0] === 0xD0 && u8[1] === 0xCF && 
      u8[2] === 0x11 && u8[3] === 0xE0 &&
      u8[4] === 0xA1 && u8[5] === 0xB1 && 
      u8[6] === 0x1A && u8[7] === 0xE1) {
    return 'xls';
  }
  
  // CSV über MIME-Type oder Dateiendung
  if (ext === 'csv' || /text\/csv|application\/csv/i.test(mimeType || '')) {
    return 'csv';
  }
  
  // HTML über Content-Sniffing (erste Bytes)
  if (u8.length >= 5) {
    const start = new TextDecoder().decode(u8.slice(0, 100)).toLowerCase();
    if (start.includes('<html') || start.includes('<!doctype')) {
      return 'html';
    }
  }
  
  return 'unknown';
}

export function firstBytesHex(arrayBuffer: ArrayBuffer, numBytes = 8): string {
  const u8 = new Uint8Array(arrayBuffer.slice(0, numBytes));
  return Array.from(u8)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}