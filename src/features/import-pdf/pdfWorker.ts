import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';

// Vite Worker Import - bundelt Worker lokal ohne CDN
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Worker-Konfiguration für lokale Nutzung
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { getDocument, type PDFDocumentProxy };

/**
 * PDF-Dokument laden und Text extrahieren
 */
export async function loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  try {
    const loadingTask = getDocument({ 
      data: new Uint8Array(arrayBuffer),
      // Disable streaming für bessere Embed-Kompatibilität
      disableStream: true,
      disableAutoFetch: true
    });
    
    return await loadingTask.promise;
  } catch (error) {
    console.error('❌ PDF loading failed:', error);
    throw new Error('PDF konnte nicht geladen werden. Prüfen Sie, ob es sich um eine gültige PDF-Datei handelt.');
  }
}

/**
 * Text von einer PDF-Seite extrahieren
 */
export async function extractTextFromPage(pdf: PDFDocumentProxy, pageNum: number): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Text-Items zu String zusammenfügen
    const text = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.warn(`⚠️ Text extraction failed for page ${pageNum}:`, error);
    return '';
  }
}

/**
 * Text von mehreren Seiten extrahieren
 */
export async function extractTextFromPages(pdf: PDFDocumentProxy, pageNumbers: number[]): Promise<{
  pageTexts: Array<{ pageNum: number; text: string; hasText: boolean }>;
  combinedText: string;
}> {
  const pageTexts: Array<{ pageNum: number; text: string; hasText: boolean }> = [];
  
  for (const pageNum of pageNumbers) {
    const text = await extractTextFromPage(pdf, pageNum);
    pageTexts.push({
      pageNum,
      text,
      hasText: text.length > 0
    });
  }
  
  const combinedText = pageTexts
    .map(p => p.text)
    .filter(text => text.length > 0)
    .join('\n\n');
  
  return { pageTexts, combinedText };
}