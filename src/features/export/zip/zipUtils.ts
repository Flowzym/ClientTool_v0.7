/**
 * Pure functions for ZIP file creation
 * Minimal ZIP builder using STORE method (no compression)
 */

export interface ZipEntry {
  path: string;
  content: string;
}

/**
 * Creates a ZIP file from multiple text entries
 * Uses STORE method (no compression) for simplicity and compatibility
 * 
 * @param entries - Array of files with path and content
 * @returns ZIP file as Uint8Array
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  if (entries.length === 0) {
    throw new Error('Cannot create ZIP with no entries');
  }

  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.path);
    const dataBytes = new TextEncoder().encode(entry.content);
    const crc = calculateCrc32(dataBytes);
    
    // Local file header
    const localHeader = createLocalFileHeader(nameBytes, dataBytes, crc);
    localHeaders.push(localHeader);
    
    // Central directory header
    const centralHeader = createCentralDirectoryHeader(nameBytes, dataBytes, crc, offset);
    centralHeaders.push(centralHeader);
    
    offset += localHeader.length;
  }

  // End of central directory record
  const centralSize = centralHeaders.reduce((sum, header) => sum + header.length, 0);
  const centralOffset = offset;
  const eocd = createEndOfCentralDirectory(centralHeaders.length, centralSize, centralOffset);

  // Combine all parts
  const totalSize = offset + centralSize + eocd.length;
  const zipData = new Uint8Array(totalSize);
  
  let position = 0;
  
  // Write local headers and data
  for (const header of localHeaders) {
    zipData.set(header, position);
    position += header.length;
  }
  
  // Write central directory
  for (const header of centralHeaders) {
    zipData.set(header, position);
    position += header.length;
  }
  
  // Write end of central directory
  zipData.set(eocd, position);

  return zipData;
}

/**
 * Creates local file header for ZIP entry
 */
function createLocalFileHeader(nameBytes: Uint8Array, dataBytes: Uint8Array, crc: number): Uint8Array {
  const header = new Uint8Array(30 + nameBytes.length + dataBytes.length);
  const view = new DataView(header.buffer);

  // Local file header signature
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true); // Version needed to extract
  view.setUint16(6, 0, true);  // General purpose bit flag
  view.setUint16(8, 0, true);  // Compression method (0 = store)
  view.setUint16(10, 0, true); // File last modification time
  view.setUint16(12, 0, true); // File last modification date
  view.setUint32(14, crc, true); // CRC-32
  view.setUint32(18, dataBytes.length, true); // Compressed size
  view.setUint32(22, dataBytes.length, true); // Uncompressed size
  view.setUint16(26, nameBytes.length, true); // File name length
  view.setUint16(28, 0, true); // Extra field length

  // File name
  header.set(nameBytes, 30);
  
  // File data
  header.set(dataBytes, 30 + nameBytes.length);

  return header;
}

/**
 * Creates central directory header for ZIP entry
 */
function createCentralDirectoryHeader(
  nameBytes: Uint8Array, 
  dataBytes: Uint8Array, 
  crc: number, 
  localHeaderOffset: number
): Uint8Array {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);

  // Central directory header signature
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true); // Version made by
  view.setUint16(6, 20, true); // Version needed to extract
  view.setUint16(8, 0, true);  // General purpose bit flag
  view.setUint16(10, 0, true); // Compression method
  view.setUint16(12, 0, true); // File last modification time
  view.setUint16(14, 0, true); // File last modification date
  view.setUint32(16, crc, true); // CRC-32
  view.setUint32(20, dataBytes.length, true); // Compressed size
  view.setUint32(24, dataBytes.length, true); // Uncompressed size
  view.setUint16(28, nameBytes.length, true); // File name length
  view.setUint16(30, 0, true); // Extra field length
  view.setUint16(32, 0, true); // File comment length
  view.setUint16(34, 0, true); // Disk number start
  view.setUint16(36, 0, true); // Internal file attributes
  view.setUint32(38, 0, true); // External file attributes
  view.setUint32(42, localHeaderOffset, true); // Relative offset of local header

  // File name
  header.set(nameBytes, 46);

  return header;
}

/**
 * Creates end of central directory record
 */
function createEndOfCentralDirectory(
  entryCount: number, 
  centralDirectorySize: number, 
  centralDirectoryOffset: number
): Uint8Array {
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);

  // End of central directory signature
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true); // Number of this disk
  view.setUint16(6, 0, true); // Disk where central directory starts
  view.setUint16(8, entryCount, true); // Number of central directory records on this disk
  view.setUint16(10, entryCount, true); // Total number of central directory records
  view.setUint32(12, centralDirectorySize, true); // Size of central directory
  view.setUint32(16, centralDirectoryOffset, true); // Offset of start of central directory
  view.setUint16(20, 0, true); // ZIP file comment length

  return eocd;
}

/**
 * Calculates CRC32 checksum for data
 * Uses standard CRC32 algorithm for ZIP compatibility
 */
function calculateCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  
  return (~crc) >>> 0;
}

/**
 * Validates ZIP entry paths for safety
 */
export function validateZipPath(path: string): boolean {
  // Prevent directory traversal
  if (path.includes('..') || path.startsWith('/')) {
    return false;
  }
  
  // Ensure reasonable path length
  if (path.length > 255) {
    return false;
  }
  
  // Ensure valid characters (basic check)
  if (!/^[a-zA-Z0-9._/-]+$/.test(path)) {
    return false;
  }
  
  return true;
}

/**
 * Sanitizes filename for ZIP entry
 */
export function sanitizeZipFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100); // Reasonable length limit
}