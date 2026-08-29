import { collection, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../../services/firebase";
import type { OrderRepository } from "../domain/orderRepository";
import { mapActiveOrderDocuments, mapOrderDocument } from "./orderMapper";

const DEFAULT_RECENT_ORDER_LIMIT = 50;

export const firestoreOrderRepository: OrderRepository = {
  async listRecent(maxResults = DEFAULT_RECENT_ORDER_LIMIT) {
    const snapshot = await getDocs(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(maxResults)),
    );
    return mapActiveOrderDocuments(snapshot.docs);
  },

  subscribeToNewOrders(onOrder, onError) {
    const newestOrderQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    let isInitialSnapshot = true;

    return onSnapshot(
      newestOrderQuery,
      (snapshot) => {
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;
          const order = mapOrderDocument(change.doc);
          if (!order._deleted) onOrder(order);
        });
      },
      (error) => onError?.(error),
    );
  },
};
