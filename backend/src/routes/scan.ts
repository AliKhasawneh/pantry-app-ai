import { Router, Request, Response } from 'express';
import { scanImage, scanImageLines, scanReceiptItems } from '../services/scan';
import { filterScannedItems, isMistralAvailable } from '../services/mistral';

const router = Router();

// POST /api/scan - Scan an image and extract text
router.post('/', async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image: string };

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const text = await scanImage(image);
    res.json({ text });
  } catch (error) {
    console.error('Error scanning image:', error);
    const message = error instanceof Error ? error.message : 'Failed to scan image';
    res.status(500).json({ error: message });
  }
});

// POST /api/scan/lines - Scan an image and extract lines
router.post('/lines', async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image: string };

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const lines = await scanImageLines(image);
    res.json({ lines });
  } catch (error) {
    console.error('Error scanning image lines:', error);
    const message = error instanceof Error ? error.message : 'Failed to scan image';
    res.status(500).json({ error: message });
  }
});

// POST /api/scan/receipt - Scan a receipt and extract items (raw OCR only)
router.post('/receipt', async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image: string };

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const items = await scanReceiptItems(image);
    res.json({ items });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    const message = error instanceof Error ? error.message : 'Failed to scan receipt';
    res.status(500).json({ error: message });
  }
});

// POST /api/scan/receipt/smart - Scan receipt with AI filtering for food items only
router.post('/receipt/smart', async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image: string };

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    // Step 1: OCR scan
    const rawItems = await scanReceiptItems(image);
    
    if (rawItems.length === 0) {
      res.json({ items: [], raw: [] });
      return;
    }

    // Step 2: AI filtering (if available)
    let filteredItems = rawItems;
    if (isMistralAvailable()) {
      try {
        filteredItems = await filterScannedItems(rawItems);
      } catch (aiError) {
        console.error('AI filtering failed, using raw items:', aiError);
        // Fall back to raw items if AI fails
      }
    }

    res.json({ 
      items: filteredItems,
      raw: rawItems // Include raw items for debugging/comparison
    });
  } catch (error) {
    console.error('Error smart scanning receipt:', error);
    const message = error instanceof Error ? error.message : 'Failed to scan receipt';
    res.status(500).json({ error: message });
  }
});

export default router;

