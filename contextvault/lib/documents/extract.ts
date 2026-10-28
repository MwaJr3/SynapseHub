import path from 'node:path';
import yauzl from 'yauzl';
import { textSegments, type Segment } from './chunking';
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'], '.txt': ['text/plain'], '.md': ['text/markdown','text/plain','application/markdown'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
export function validateUpload(filename: string, contentType: string, bytes: Uint8Array): { filename: string; contentType: string } {
  const name = path.basename(filename).replace(/[\u0000-\u001f\u007f]/g,'').trim();
  if (!name || name !== filename || /[\\/]/.test(name) || name.length > 180 || name.startsWith('.')) throw new Error('Choose a valid filename without folders.');
  const ext = path.extname(name).toLowerCase(); const types = TYPES[ext];
  if (!types) throw new Error('Supported files are PDF, TXT, Markdown, and DOCX.');
  if (!bytes.length || bytes.length > MAX_FILE_SIZE) throw new Error('File must be between 1 byte and 10 MB.');
  const type = (contentType || '').split(';')[0].toLowerCase();
  if (type && type !== 'application/octet-stream' && !types.includes(type)) throw new Error('File type does not match its extension.');
  const head = Buffer.from(bytes.slice(0,8));
  if (ext === '.pdf' && !head.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error('The PDF signature is invalid.');
  if (ext === '.docx' && !(head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04)) throw new Error('The DOCX signature is invalid.');
  if (ext === '.txt' || ext === '.md') {
    if (bytes.includes(0)) throw new Error('Text files cannot contain binary data.');
    try { new TextDecoder('utf-8', { fatal:true }).decode(bytes); } catch { throw new Error('Text files must use UTF-8 encoding.'); }
  }
  return { filename: name, contentType: types[0] };
}
async function inspectDocx(bytes: Buffer): Promise<void> {
  await new Promise<void>((resolve,reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries:true }, (err, zip) => {
      if (err || !zip) return reject(new Error('Could not read this DOCX file.'));
      let total = 0, count = 0, hasDocument = false;
      zip.on('entry', (entry) => {
        count++; total += entry.uncompressedSize;
        if (entry.fileName === 'word/document.xml') hasDocument = true;
        if (count > 500 || total > 40*1024*1024 || entry.fileName.includes('..') || entry.fileName.startsWith('/')) { zip.close(); reject(new Error('DOCX archive exceeds safe limits.')); return; }
        zip.readEntry();
      });
      zip.on('end', () => hasDocument ? resolve() : reject(new Error('DOCX is missing document content.')));
      zip.on('error', () => reject(new Error('Could not read this DOCX file.'))); zip.readEntry();
    });
  });
}
export async function extractDocument(filename: string, bytes: Uint8Array): Promise<{ segments: Segment[]; pageCount: number | null }> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.txt' || ext === '.md') return { segments: textSegments(new TextDecoder().decode(bytes), ext === '.md'), pageCount: null };
  if (ext === '.docx') {
    await inspectDocx(Buffer.from(bytes));
    const mammoth = await import('mammoth'); const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { segments: textSegments(result.value), pageCount: null };
  }
  if (ext === '.pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false }).promise;
    if (doc.numPages > 300) throw new Error('PDF exceeds the 300 page limit.');
    const segments: Segment[] = [];
    for (let page=1; page<=doc.numPages; page++) {
      const pdfPage = await doc.getPage(page); const content = await pdfPage.getTextContent();
      const text = content.items.map((item) => 'str' in item ? item.str : '').join(' ');
      segments.push(...textSegments(text, false, page));
    }
    await doc.destroy();
    return { segments, pageCount: doc.numPages };
  }
  throw new Error('Unsupported document type.');
}
