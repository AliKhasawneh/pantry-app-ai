import Tesseract from 'tesseract.js';

// Scan image and extract text using OCR
export async function scanImage(imageData: string | Buffer): Promise<string> {
  const result = await Tesseract.recognize(imageData, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  return result.data.text;
}

// Scan image and extract individual lines
export async function scanImageLines(imageData: string | Buffer): Promise<string[]> {
  const result = await Tesseract.recognize(imageData, 'eng');
  const text = result.data.text;
  
  // Split by newlines and filter empty lines
  return text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
}

// Scan receipt/list and try to extract item names
export async function scanReceiptItems(imageData: string | Buffer): Promise<string[]> {
  const lines = await scanImageLines(imageData);
  
  // Filter out common non-item lines (prices, totals, headers, etc.)
  const itemLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    // Skip lines that are likely not items
    if (lower.includes('total') || lower.includes('subtotal')) return false;
    if (lower.includes('tax') || lower.includes('change')) return false;
    if (lower.includes('cash') || lower.includes('credit') || lower.includes('debit')) return false;
    if (lower.includes('thank you') || lower.includes('receipt')) return false;
    if (/^\d+[.,]\d{2}$/.test(line.trim())) return false; // Just a price
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(line.trim())) return false; // Date
    if (line.length < 2) return false;
    return true;
  });

  // Clean up item names (remove quantities, prices at end)
  return itemLines.map((line) => {
    // Remove trailing prices like "2.99" or "$2.99"
    let cleaned = line.replace(/\$?\d+[.,]\d{2}\s*$/, '').trim();
    // Remove leading quantities like "2x" or "2 x"
    cleaned = cleaned.replace(/^\d+\s*[xX]\s*/, '').trim();
    return cleaned;
  }).filter((item) => item.length > 1);
}
