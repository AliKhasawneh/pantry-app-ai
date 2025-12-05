import { useState } from 'react';
import { Plus } from 'lucide-react';
import './App.css';
import { StorageAreaCard, EditAreaModal, AddAreaModal, OpenItemModal, AIButton, ScanButton } from './components';
import { usePantryStore } from './hooks/usePantryStore';
import type { StorageAreaId, PantryItem } from './domain/types';

function LoadingSkeleton() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Pantry App</h1>
      </header>

      <main className="app-main">
        <div className="areas-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="area-card skeleton-card">
              <div className="skeleton-header"></div>
              <div className="skeleton-form"></div>
              <div className="skeleton-body"></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function App() {
  const store = usePantryStore();
  const [editingAreaId, setEditingAreaId] = useState<StorageAreaId | null>(null);
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [openingItem, setOpeningItem] = useState<PantryItem | null>(null);
  const [collapsedAreas, setCollapsedAreas] = useState<Set<StorageAreaId>>(new Set());

  if (store.isLoading) {
    return <LoadingSkeleton />;
  }

  const editingArea = editingAreaId
    ? store.storageAreas.find((a) => a.id === editingAreaId)
    : null;

  const toggleCollapsed = (areaId: StorageAreaId) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  };

  const handleOpenItem = (itemId: string) => {
    const item = store.items.find((i) => i.id === itemId);
    if (item) {
      // If there's only 1 item, skip the modal and start using automatically
      if (item.quantity === 1) {
        store.openItem(item.id, 1);
      } else {
        setOpeningItem(item);
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pantry App</h1>
      </header>

      <main className="app-main">
        <div className="areas-grid">
          {store.storageAreas.map((area) => (
            <StorageAreaCard
              key={area.id}
              area={area}
              items={store.getItemsForArea(area.id)}
              isCollapsed={collapsedAreas.has(area.id)}
              onToggleCollapse={() => toggleCollapsed(area.id)}
              onAddItem={(name, qty, expiryDate) => store.addItem(name, qty, area.id, expiryDate)}
              onUpdateQuantity={store.updateItemQuantity}
              onRemoveItem={store.removeItem}
              onOpenItem={handleOpenItem}
              onEditArea={() => setEditingAreaId(area.id)}
            />
          ))}

          <button
            type="button"
            className="add-area-card"
            onClick={() => setIsAddingArea(true)}
          >
            <Plus size={24} />
            <span>Add Area</span>
          </button>
        </div>
      </main>

      {editingArea && (
        <EditAreaModal
          area={editingArea}
          onSave={(updates) => store.updateStorageArea(editingArea.id, updates)}
          onDelete={() => store.deleteStorageArea(editingArea.id)}
          onClose={() => setEditingAreaId(null)}
        />
      )}

      {isAddingArea && (
        <AddAreaModal
          existingColors={store.storageAreas.map((a) => a.color)}
          onAdd={store.addStorageArea}
          onClose={() => setIsAddingArea(false)}
        />
      )}

      {openingItem && (
        <OpenItemModal
          item={openingItem}
          onOpen={(quantity) => store.openItem(openingItem.id, quantity)}
          onClose={() => setOpeningItem(null)}
        />
      )}

      <ScanButton 
        storageAreas={store.storageAreas}
        onAddItem={(item, storageAreaId, expiryDate) => store.addItem(item, 1, storageAreaId, expiryDate)} 
      />
      <AIButton pantryItems={store.items.map((item) => item.name)} />
    </div>
  );
}

export default App;
