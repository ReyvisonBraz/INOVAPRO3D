import type { Order } from "../../../types/domain";

export type OrderSubscription = () => void;

/**
 * Fronteira de persistência do domínio de pedidos.
 *
 * A interface não expõe tipos do Firebase para que hooks e componentes possam
 * ser testados com uma implementação em memória.
 */
export interface OrderRepository {
  listRecent(maxResults?: number): Promise<Order[]>;
  subscribeToNewOrders(
    onOrder: (order: Order) => void,
    onError?: (error: unknown) => void,
  ): OrderSubscription;
}
