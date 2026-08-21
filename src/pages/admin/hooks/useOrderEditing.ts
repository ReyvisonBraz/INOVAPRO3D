import { useCallback, useState } from "react";
import { toast } from "sonner";
import { updateOrderItems } from "../../../services/orders";
import { handleFirestoreError, OperationType } from "../../../services/firebase";
import type { Order, OrderItem } from "../../../types/domain";

export function useOrderEditing() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingItems, setEditingItems] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);

  const handleToggleItemEditing = useCallback(() => {
    if (!selectedOrder) return;

    if (!editingItems) {
      setEditedItems(JSON.parse(JSON.stringify(selectedOrder.items || [])) as OrderItem[]);
      setEditingItems(true);
      return;
    }

    const newTotal = editedItems.reduce(
      (total, item) => total + (item.price || 0) * (item.quantity || 1),
      0,
    );
    void updateOrderItems(selectedOrder.id, editedItems, newTotal)
      .then(() => {
        setSelectedOrder((order) =>
          order ? { ...order, items: editedItems, total: newTotal } : null,
        );
        toast.success("Itens atualizados!");
      })
      .catch((error) =>
        handleFirestoreError(error, OperationType.UPDATE, `orders/${selectedOrder.id}`),
      );
    setEditingItems(false);
  }, [editedItems, editingItems, selectedOrder]);

  const updateEditedItem = useCallback((index: number, patch: Partial<OrderItem>) => {
    setEditedItems((items) => {
      const next = [...items];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  return {
    selectedOrder,
    setSelectedOrder,
    editingItems,
    editedItems,
    handleToggleItemEditing,
    updateEditedItem,
  };
}
