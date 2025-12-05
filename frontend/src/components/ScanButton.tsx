import { useState, useRef } from 'react';
import { Camera, X, Loader2, Plus, ChevronDown, Check } from 'lucide-react';
import { scanApi } from '../api';
import type { StorageArea, StorageAreaId } from '../domain/types';

interface ScanButtonProps {
  storageAreas: StorageArea[];
  onAddItem: (item: string, storageAreaId: StorageAreaId, expiryDate?: string) => void;
}

interface PendingItem {
  name: string;
  selectedAreaId: StorageAreaId | null;
  expiryDate: string;
}

export function ScanButton({ storageAreas, onAddItem }: ScanButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage('Scanning image...');
    setError(null);
    setPendingItems([]);
    setAddedCount(0);

    try {
      const base64 = await fileToBase64(file);
      
      setLoadingMessage('Reading text from image...');
      const response = await scanApi.scanReceiptSmart(base64);
      
      if (response.items.length === 0) {
        if (response.raw && response.raw.length > 0) {
          setError('No food items detected. The image may contain non-grocery items.');
        } else {
          setError('No items found in the image. Try a clearer photo.');
        }
      } else {
        // Initialize pending items with default area
        const defaultAreaId = storageAreas[0]?.id || null;
        setPendingItems(response.items.map(name => ({
          name,
          selectedAreaId: defaultAreaId,
          expiryDate: ''
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan image');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAreaChange = (index: number, areaId: StorageAreaId) => {
    setPendingItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selectedAreaId: areaId } : item
    ));
  };

  const handleExpiryChange = (index: number, expiryDate: string) => {
    setPendingItems(prev => prev.map((item, i) => 
      i === index ? { ...item, expiryDate } : item
    ));
  };

  const handleAddAll = () => {
    let count = 0;
    pendingItems.forEach(item => {
      if (item.selectedAreaId) {
        onAddItem(item.name, item.selectedAreaId, item.expiryDate || undefined);
        count++;
      }
    });
    setPendingItems([]);
    setAddedCount(prev => prev + count);
  };

  const handleDiscardItem = (index: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setPendingItems([]);
    setAddedCount(0);
    setError(null);
  };

  const handleScanMore = () => {
    setPendingItems([]);
    setAddedCount(0);
    setError(null);
    fileInputRef.current?.click();
  };

  const allItemsHandled = pendingItems.length === 0 && addedCount > 0;

  return (
    <>
      {/* Floating Scan Button */}
      <div className="scan-fab-container">
        <button
          className="scan-fab"
          onClick={() => setIsModalOpen(true)}
          aria-label="Scan Receipt"
        >
          <Camera size={24} />
        </button>
      </div>

      {/* Scan Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleClose}>
          <div className="modal scan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Camera size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Scan Receipt
              </h2>
              <button className="modal-close" onClick={handleClose}>
                <X size={20} />
              </button>
            </div>

            <div className="scan-modal-content">
              {/* Upload Section - show when no items and not loading */}
              {pendingItems.length === 0 && !isLoading && !allItemsHandled && (
                <div className="scan-upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="scan-file-input"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload" className="scan-upload-label">
                    <Camera size={48} strokeWidth={1.5} />
                    <span>Tap to upload or take a photo</span>
                    <span className="scan-upload-hint">Supports receipts, grocery lists, ingredient labels</span>
                  </label>
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="scan-loading">
                  <Loader2 size={48} className="ai-spinner" />
                  <p>{loadingMessage}</p>
                  <span>AI is filtering for food items</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="scan-error">
                  <p>{error}</p>
                  <button 
                    className="scan-retry-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* All items handled - success state */}
              {allItemsHandled && (
                <div className="scan-success">
                  <div className="scan-success-icon">
                    <Check size={32} />
                  </div>
                  <p>Added {addedCount} item{addedCount !== 1 ? 's' : ''} to your pantry!</p>
                  <div className="scan-success-actions">
                    <button className="scan-add-btn" onClick={handleScanMore}>
                      <Camera size={18} />
                      Scan More
                    </button>
                    <button className="scan-done-btn" onClick={handleClose}>
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Items List */}
              {pendingItems.length > 0 && (
                <div className="scan-results">
                  <p className="scan-results-title">
                    {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} remaining
                    {addedCount > 0 && <span className="scan-added-count"> • {addedCount} added</span>}
                  </p>
                  <div className="scan-items-list">
                    {pendingItems.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="scan-item-container">
                        <div className="scan-item-row">
                          <button
                            className="scan-item-discard-btn"
                            onClick={() => handleDiscardItem(index)}
                            title="Discard item"
                          >
                            <X size={16} />
                          </button>

                          <span className="scan-item-name" title={item.name}>{item.name}</span>
                          
                          <div className="scan-item-area-dropdown">
                            <select
                              value={item.selectedAreaId || ''}
                              onChange={(e) => handleAreaChange(index, e.target.value as StorageAreaId)}
                              className="scan-item-area-select"
                            >
                              {storageAreas.map((area) => (
                                <option key={area.id} value={area.id}>
                                  {area.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="scan-item-chevron" />
                          </div>
                        </div>
                        <div className="scan-item-expiry">
                          <label className="scan-item-expiry-label">Expiry:</label>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => handleExpiryChange(index, e.target.value)}
                            className="scan-item-expiry-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="scan-bottom-actions">
                    <button 
                      className="scan-add-all-btn"
                      onClick={handleAddAll}
                      disabled={pendingItems.length === 0}
                    >
                      <Plus size={18} />
                      Add All {pendingItems.length} Item{pendingItems.length !== 1 ? 's' : ''}
                    </button>
                    <button 
                      className="scan-rescan-btn"
                      onClick={handleScanMore}
                    >
                      <Camera size={16} />
                      Scan Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

