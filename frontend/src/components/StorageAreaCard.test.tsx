import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StorageAreaCard } from './StorageAreaCard';
import type { StorageArea, PantryItem } from '../domain/types';

const mockArea: StorageArea = {
  id: 'test-area-1',
  name: 'Fridge',
  icon: 'refrigerator',
  color: 'cyan',
};

const mockItems: PantryItem[] = [
  { id: 'item-1', name: 'Milk', quantity: 2, storageAreaId: 'test-area-1', createdAt: Date.now() },
  { id: 'item-2', name: 'Eggs', quantity: 12, storageAreaId: 'test-area-1', createdAt: Date.now() },
];

const defaultProps = {
  area: mockArea,
  items: [] as PantryItem[],
  isCollapsed: false,
  onToggleCollapse: vi.fn(),
  onAddItem: vi.fn(),
  onUpdateQuantity: vi.fn(),
  onRemoveItem: vi.fn(),
  onEditArea: vi.fn(),
};

describe('StorageAreaCard', () => {
  it('renders area name and item count', () => {
    render(<StorageAreaCard {...defaultProps} items={mockItems} />);

    expect(screen.getByRole('heading', { name: 'Fridge' })).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument(); // 2 + 12
  });

  it('renders all items', () => {
    render(<StorageAreaCard {...defaultProps} items={mockItems} />);

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Eggs')).toBeInTheDocument();
  });

  it('shows empty message when no items', () => {
    render(<StorageAreaCard {...defaultProps} items={[]} />);

    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('adds item when form is submitted', async () => {
    const user = userEvent.setup();
    const onAddItem = vi.fn();
    render(<StorageAreaCard {...defaultProps} onAddItem={onAddItem} />);

    const input = screen.getByPlaceholderText('Add item...');
    await user.type(input, 'Butter');
    await user.keyboard('{Enter}');

    expect(onAddItem).toHaveBeenCalledWith('Butter', 1);
    expect(input).toHaveValue(''); // clears after submit
  });

  it('updates quantity when +/- clicked on item', async () => {
    const user = userEvent.setup();
    const onUpdateQuantity = vi.fn();
    render(<StorageAreaCard {...defaultProps} items={mockItems} onUpdateQuantity={onUpdateQuantity} />);

    await user.click(screen.getByLabelText('Increase Milk'));
    expect(onUpdateQuantity).toHaveBeenCalledWith('item-1', 3);

    await user.click(screen.getByLabelText('Decrease Eggs'));
    expect(onUpdateQuantity).toHaveBeenCalledWith('item-2', 11);
  });

  it('removes item when X clicked', async () => {
    const user = userEvent.setup();
    const onRemoveItem = vi.fn();
    render(<StorageAreaCard {...defaultProps} items={mockItems} onRemoveItem={onRemoveItem} />);

    await user.click(screen.getByLabelText('Remove Milk'));

    expect(onRemoveItem).toHaveBeenCalledWith('item-1');
  });

  it('opens settings when edit button clicked', async () => {
    const user = userEvent.setup();
    const onEditArea = vi.fn();
    render(<StorageAreaCard {...defaultProps} onEditArea={onEditArea} />);

    await user.click(screen.getByLabelText('Edit Fridge'));

    expect(onEditArea).toHaveBeenCalled();
  });

  it('applies collapsed class when collapsed', () => {
    const { container } = render(<StorageAreaCard {...defaultProps} isCollapsed={true} />);

    expect(container.querySelector('.area-card--collapsed')).toBeInTheDocument();
  });
});
