import type { FormEvent } from 'react';
import { useState, useRef } from 'react';
import { Plus, Minus, X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { StorageArea, PantryItem } from '../domain/types';
import { AreaIcon } from './AreaIcon';

// Threshold for showing collapse toggle on desktop (roughly how many items fit in collapsed view)
const COLLAPSE_THRESHOLD = 4;

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Calculate days until expiry
function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Check if item is expired
function isExpired(expiryDate: string): boolean {
  return getDaysUntilExpiry(expiryDate) < 0;
}

// Get the start of day timestamp (for grouping items opened on the same day)
function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Extended PantryItem type for stacking (includes all merged IDs)
interface StackedPantryItem extends PantryItem {
  mergedIds?: string[]; // All IDs that were merged into this item
}

// Stack items: merge items with same name opened on the same day and same expiry date
function stackItems(items: PantryItem[]): StackedPantryItem[] {
  const unopened = items.filter(item => !item.isOpened);
  const opened = items.filter(item => item.isOpened);

  // Group opened items by name + day + expiry date
  const openedMap = new Map<string, StackedPantryItem>();
  
  for (const item of opened) {
    if (!item.openedAt) continue;
    
    const day = getStartOfDay(item.openedAt);
    const expiryKey = item.expiryDate || 'no-expiry';
    const key = `${item.name.toLowerCase()}_${day}_${expiryKey}`;
    
    const existing = openedMap.get(key);
    if (existing) {
      // Merge quantities, keep the most recent openedAt, collect all IDs
      openedMap.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        openedAt: Math.max(existing.openedAt || 0, item.openedAt),
        mergedIds: [...(existing.mergedIds || [existing.id]), item.id],
      });
    } else {
      openedMap.set(key, { ...item, mergedIds: [item.id] });
    }
  }

  const stackedOpened = Array.from(openedMap.values());

  // Sort unopened items by name
  unopened.sort((a, b) => a.name.localeCompare(b.name));

  // Sort opened items by opened date (most recent first), then by name
  stackedOpened.sort((a, b) => {
    const timeA = a.openedAt || 0;
    const timeB = b.openedAt || 0;
    
    // First sort by day (most recent day first)
    const dayA = getStartOfDay(timeA);
    const dayB = getStartOfDay(timeB);
    
    if (dayB !== dayA) {
      return dayB - dayA;
    }
    
    // Within same day, sort by name
    return a.name.localeCompare(b.name);
  });

  return [...unopened, ...stackedOpened];
}

interface StorageAreaCardProps {
  area: StorageArea;
  items: PantryItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddItem: (name: string, quantity: number, expiryDate?: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onOpenItem: (id: string) => void;
  onEditArea: () => void;
}

export function StorageAreaCard({
  area,
  items,
  isCollapsed,
  onToggleCollapse,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onOpenItem,
  onEditArea,
}: StorageAreaCardProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemExpiry, setNewItemExpiry] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem(newItemName.trim(), newItemQty, newItemExpiry || undefined);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemExpiry('');
    inputRef.current?.focus();
  };

  // Handle quantity update for potentially stacked items
  const handleUpdateQuantity = (item: StackedPantryItem, newQuantity: number) => {
    if (item.mergedIds && item.mergedIds.length > 1) {
      // For stacked items, distribute the quantity change
      const oldTotal = item.quantity;
      const diff = newQuantity - oldTotal;
      
      if (diff < 0) {
        // Decreasing: remove items one by one
        let remaining = Math.abs(diff);
        for (const id of item.mergedIds) {
          if (remaining <= 0) break;
          const originalItem = items.find(i => i.id === id);
          if (originalItem) {
            const toRemove = Math.min(remaining, originalItem.quantity);
            onUpdateQuantity(id, originalItem.quantity - toRemove);
            remaining -= toRemove;
          }
        }
      } else if (diff > 0) {
        // Increasing: add to the first item
        const firstId = item.mergedIds[0];
        const originalItem = items.find(i => i.id === firstId);
        if (originalItem) {
          onUpdateQuantity(firstId, originalItem.quantity + diff);
        }
      }
    } else {
      // Single item, update normally
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  // Handle remove for potentially stacked items
  const handleRemoveItem = (item: StackedPantryItem) => {
    if (item.mergedIds && item.mergedIds.length > 1) {
      // Remove all merged items
      for (const id of item.mergedIds) {
        onRemoveItem(id);
      }
    } else {
      // Single item, remove normally
      onRemoveItem(item.id);
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const showCollapseToggle = items.length > COLLAPSE_THRESHOLD;
  const stackedItems = stackItems(items);

  return (
    <section className={`area-card area-card--${area.color} ${isCollapsed ? 'area-card--collapsed' : ''}`}>
      {/* Header - clickable on mobile to toggle collapse */}
      <header 
        className="area-card-header"
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleCollapse(); }}
        aria-expanded={!isCollapsed}
      >
        <div className="area-card-title">
          <AreaIcon icon={area.icon} size={18} />
          <h2>{area.name}</h2>
          <span className="area-card-count">{itemCount}</span>
        </div>
        {/* Mobile collapse indicator */}
        <span className="area-card-collapse-indicator">
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
        <button
          type="button"
          className="area-card-settings"
          onClick={(e) => {
            e.stopPropagation();
            onEditArea();
          }}
          aria-label={`Edit ${area.name}`}
        >
          <Settings size={16} />
        </button>
      </header>

      <div className="area-card-form-container" onClick={(e) => e.stopPropagation()}>
        <form 
          onSubmit={handleSubmit} 
          className="area-card-form"
        >
          <input
            ref={inputRef}
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add item..."
            aria-label={`Add item to ${area.name}`}
            className="item-name-input"
          />
          <div className="qty-input">
            <button
              type="button"
              onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))}
              aria-label="Decrease quantity"
              tabIndex={-1}
            >
              <Minus size={14} />
            </button>
            <span>{newItemQty}</span>
            <button
              type="button"
              onClick={() => setNewItemQty(newItemQty + 1)}
              aria-label="Increase quantity"
              tabIndex={-1}
            >
              <Plus size={14} />
            </button>
          </div>
          <button type="submit" className="add-btn" disabled={!newItemName.trim()}>
            <Plus size={16} />
          </button>
        </form>
        <div className="expiry-date-row">
          <label htmlFor={`expiry-${area.id}`} className="expiry-label">Expiry Date:</label>
          <input
            id={`expiry-${area.id}`}
            type="date"
            value={newItemExpiry}
            onChange={(e) => setNewItemExpiry(e.target.value)}
            aria-label="Expiry date"
            className="item-expiry-input-below"
          />
        </div>
      </div>

      <div className={`area-card-body ${isCollapsed ? 'area-card-body--collapsed' : ''}`}>
        {items.length === 0 ? (
          <p className="area-card-empty">No items yet</p>
        ) : (
          <ul className="area-card-items">
            {stackedItems.map((item) => (
              <li key={item.mergedIds ? item.mergedIds.join('-') : item.id} className="item-row">
                <span className="item-name">
                  <span className="item-name-text" title={item.name}>{item.name}</span>
                  {item.isOpened && item.openedAt && (
                    <span className="item-opened-badge" title={`Started ${formatDate(item.openedAt)}`}>
                      In Use · {formatDate(item.openedAt)}
                    </span>
                  )}
                  {item.expiryDate && isExpired(item.expiryDate) && (
                    <span className="item-expired-badge" title={`Expired on ${item.expiryDate}`}>
                      Expired
                    </span>
                  )}
                  {item.expiryDate && !item.isOpened && !isExpired(item.expiryDate) && (
                    <span className="item-expiry-badge" title={`Expires on ${item.expiryDate}`}>
                      {getDaysUntilExpiry(item.expiryDate)} day{getDaysUntilExpiry(item.expiryDate) !== 1 ? 's' : ''} left
                    </span>
                  )}
                </span>
                <div className="item-controls">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                    aria-label={`Decrease ${item.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="item-qty">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                    aria-label={`Increase ${item.name}`}
                  >
                    <Plus size={14} />
                  </button>
                  {!item.isOpened && (
                    <button
                      type="button"
                      className="item-open-btn"
                      onClick={() => onOpenItem(item.id)}
                      aria-label={`Start using ${item.name}`}
                    >
                      Start Using
                    </button>
                  )}
                  <button
                    type="button"
                    className="item-remove"
                    onClick={() => handleRemoveItem(item)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop-only toggle, only if enough items */}
      {showCollapseToggle && (
        <button
          type="button"
          className="area-card-collapse-toggle"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? `Expand ${area.name}` : `Collapse ${area.name}`}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      )}
    </section>
  );
}
