/** Fayl turini kengaytmaga emas, haqiqiy boshlang'ich baytlarga (magic bytes) qarab aniqlaydi. */
export type DetectedType = 'jpg' | 'png' | 'pdf';

export function detectType(buf: Buffer): DetectedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
