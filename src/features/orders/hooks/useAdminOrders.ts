import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Order } from "../../../types/domain";
import { firestoreOrderRepository } from "../data/firestoreOrderRepository";
import type { OrderRepository } from "../domain/orderRepository";

const RECENT_ORDER_LIMIT = 50;

export function mergeRecentOrder(
  currentOrders: readonly Order[],
  incomingOrder: Order,
  maxResults = RECENT_ORDER_LIMIT,
): Order[] {
  return [incomingOrder, ...currentOrders.filter((order) => order.id !== incomingOrder.id)].slice(
    0,
    maxResults,
  );
}

interface UseAdminOrdersOptions {
  repository?: OrderRepository;
  onNewOrder?: (order: Order) => void;
}

interface UseAdminOrdersResult {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  loading: boolean;
  error: unknown;
  refreshOrders(): Promise<void>;
}

export function useAdminOrders({
  repository = firestoreOrderRepository,
  onNewOrder,
}: UseAdminOrdersOptions = {}): UseAdminOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await repository.listRecent(RECENT_ORDER_LIMIT));
    } catch (loadError) {
      setError(loadError);
      console.error("[admin/orders] falha ao carregar pedidos:", loadError);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void repository.listRecent(RECENT_ORDER_LIMIT).then(
      (recentOrders) => {
        if (!active) return;
        setOrders(recentOrders);
        setError(null);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) return;
        setError(loadError);
        setLoading(false);
        console.error("[admin/orders] falha ao carregar pedidos:", loadError);
      },
    );

    const unsubscribe = repository.subscribeToNewOrders(
      (order) => {
        if (!active) return;
        setOrders((current) => mergeRecentOrder(current, order));
        onNewOrder?.(order);
      },
      (subscriptionError) => {
        if (!active) return;
        setError(subscriptionError);
        console.error("[admin/orders] falha na assinatura de pedidos:", subscriptionError);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [onNewOrder, repository]);

  return { orders, setOrders, loading, error, refreshOrders };
}
