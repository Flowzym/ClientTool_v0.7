/**
 * Minimal ZIP builder (STORE method, no compression).
 * createZip([{name, data}]) -> Blob
 */
function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function strToUint8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function writeUInt32LE(view: DataView, offset: number, val: number) {
  view.setUint32(offset, val, true);
}
function writeUInt16LE(view: DataView, offset: number, val: number) {
  view.setUint16(offset, val, true);
}

export function createZip(files: { name: string; data: string }[]): Blob {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = strToUint8(f.name);
    const dataBytes = strToUint8(f.data);
    const crc = crc32(dataBytes);
    const compressedSize = dataBytes.length;
    const uncompressedSize = dataBytes.length;
    const localHeader = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const dv = new DataView(localHeader.buffer);

    // Local file header signature
    writeUInt32LE(dv, 0, 0x04034b50);
    writeUInt16LE(dv, 4, 20); // version needed to extract
    writeUInt16LE(dv, 6, 0);  // general purpose
    writeUInt16LE(dv, 8, 0);  // compression method (0 = store)
    writeUInt16LE(dv, 10, 0); // file mod time
    writeUInt16LE(dv, 12, 0); // file mod date
    writeUInt32LE(dv, 14, crc);
    writeUInt32LE(dv, 18, compressedSize);
    writeUInt32LE(dv, 22, uncompressedSize);
    writeUInt16LE(dv, 26, nameBytes.length);
    writeUInt16LE(dv, 28, 0); // extra field length

    localHeader.set(nameBytes, 30);
    localHeader.set(dataBytes, 30 + nameBytes.length);

    localHeaders.push(localHeader);

    // Central directory header
    const central = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(central.buffer);
    writeUInt32LE(cdv, 0, 0x02014b50);
    writeUInt16LE(cdv, 4, 20); // version made by
    writeUInt16LE(cdv, 6, 20); // version needed
    writeUInt16LE(cdv, 8, 0);  // flags
    writeUInt16LE(cdv, 10, 0); // method
    writeUInt16LE(cdv, 12, 0); // time
    writeUInt16LE(cdv, 14, 0); // date
    writeUInt32LE(cdv, 16, crc);
    writeUInt32LE(cdv, 20, compressedSize);
    writeUInt32LE(cdv, 24, uncompressedSize);
    writeUInt16LE(cdv, 28, nameBytes.length);
    writeUInt16LE(cdv, 30, 0); // extra
    writeUInt16LE(cdv, 32, 0); // comment length
    writeUInt16LE(cdv, 34, 0); // disk number start
    writeUInt16LE(cdv, 36, 0); // internal attrs
    writeUInt32LE(cdv, 38, 0); // external attrs
    writeUInt32LE(cdv, 42, offset); // relative offset of local header
    central.set(nameBytes, 46);

    centralHeaders.push(central);
    offset += localHeader.length;
  }

  // End of central directory
  const centralSize = centralHeaders.reduce((s, u) => s + u.length, 0);
  const centralOffset = offset;
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  writeUInt32LE(edv, 0, 0x06054b50);
  writeUInt16LE(edv, 4, 0); // disk no
  writeUInt16LE(edv, 6, 0); // start disk
  writeUInt16LE(edv, 8, centralHeaders.length);
  writeUInt16LE(edv, 10, centralHeaders.length);
  writeUInt32LE(edv, 12, centralSize);
  writeUInt32LE(edv, 16, centralOffset);
  writeUInt16LE(edv, 20, 0); // comment length

  // Concatenate all parts
  const totalSize = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const lh of localHeaders) { out.set(lh, pos); pos += lh.length; }
  for (const ch of centralHeaders) { out.set(ch, pos); pos += ch.length; }
  out.set(eocd, pos);

  return new Blob([out], { type: 'application/zip' });
}
