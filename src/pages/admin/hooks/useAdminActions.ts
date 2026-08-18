import { Dispatch, SetStateAction, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  type UpdateData,
  type DocumentData,
} from "firebase/firestore";
import { toast } from "sonner";
import { auth, db, handleFirestoreError, OperationType } from "../../../services/firebase";
import type { Order, Quote, Ticket, TrashEntry } from "../../../types/domain";
import type { OrderStatus } from "../../../types/domain";
import { InsufficientInventoryError, transitionOrderStatus } from "../../../services/inventory";

interface Deps {
  orders: Order[];
  fetchData: () => Promise<void>;
  selectedOrder: Order | null;
  setSelectedOrder: Dispatch<SetStateAction<Order | null>>;
  selectedCustomer: Quote | Ticket | null;
  setSelectedCustomer: Dispatch<SetStateAction<Quote | Ticket | null>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
  setTrashItems: Dispatch<SetStateAction<TrashEntry[]>>;
}

const DELETABLE_ORDER_STATUSES = new Set<OrderStatus>(["PENDING_PAYMENT", "CANCELED"]);

function recordLabel(type: string, id: string, data: DocumentData): string {
  const candidate =
    data.fileName || data.name || data.title || data.userName || data.email || data.code;
  const collectionNames: Record<string, string> = {
    orders: "Pedido",
    quotes: "Orçamento",
    products: "Produto",
    categories: "Categoria",
    materials: "Material",
    customers: "Cliente",
    tickets: "Ticket",
    faqs: "FAQ",
    showcase: "Item da vitrine",
    coupons: "Cupom",
  };
  return candidate
    ? String(candidate)
    : `${collectionNames[type] || "Registro"} #${id.slice(0, 8)}`;
}

/**
 * Ações genéricas sobre registros do admin: atualizar status (com atalho de
 * notificação WhatsApp para pedidos), soft-delete e código de rastreio.
 */
export function useAdminActions({
  orders,
  fetchData,
  selectedOrder,
  setSelectedOrder,
  selectedCustomer,
  setSelectedCustomer,
  setOrders,
  setQuotes,
  setTrashItems,
}: Deps) {
  const updateStatus = useCallback(
    async (type: string, id: string, newStatus: string | Record<string, unknown>) => {
      try {
        const payload = typeof newStatus === "object" ? newStatus : { status: newStatus };
        if (type === "orders" && typeof newStatus === "string") {
          const order = orders.find((item) => item.id === id) ?? selectedOrder;
          if (!order) throw new Error("Pedido nao encontrado para atualizar o status.");
          await transitionOrderStatus(order, newStatus as OrderStatus);
        } else {
          await updateDoc(doc(db, type, id), payload as UpdateData<DocumentData>);
        }
        fetchData();
        if (type === "orders" && selectedOrder?.id === id) {
          setSelectedOrder((prev) => (prev ? { ...prev, ...payload } : null));
        }
        if (type === "quotes" && selectedCustomer?.id === id) {
          setSelectedCustomer((prev) => (prev ? { ...prev, ...payload } : null));
        }

        if (type === "orders" && typeof newStatus === "string") {
          const order = orders.find((o) => o.id === id) ?? selectedOrder;
          const phoneRaw = (order?.phone ?? "").replace(/\D/g, "");
          if (phoneRaw.length >= 10 && phoneRaw.length <= 11) {
            const orderId = id.slice(0, 8).toUpperCase();
            const origin = window.location.origin;
            const STATUS_MESSAGES: Partial<Record<string, string>> = {
              PAID: `✅ Pagamento confirmado! Seu pedido #${orderId} foi aprovado e já entrou na fila de produção. Acompanhe em ${origin}/meus-pedidos`,
              QUEUE: `🖨️ Seu pedido #${orderId} entrou na fila de impressão! Acompanhe em ${origin}/meus-pedidos`,
              PRINTING: `⚡ Impressão iniciada! Seu pedido #${orderId} está sendo fabricado agora. Acompanhe em ${origin}/meus-pedidos`,
              FINISHING: `🔧 Acabamento em andamento! Seu pedido #${orderId} está na fase de finalização.`,
              SHIPPED: `🚚 Pedido enviado! Seu pedido #${orderId} está a caminho. Acompanhe em ${origin}/meus-pedidos`,
              COMPLETED: `✅ Pedido entregue! Obrigado por escolher a INOVAPRO3D. Seu pedido #${orderId} foi concluído com sucesso! ⭐`,
              CANCELED: `❌ Seu pedido #${orderId} foi cancelado. Em caso de dúvidas, entre em contato conosco.`,
            };
            const text =
              STATUS_MESSAGES[newStatus] ??
              `📦 Atualização do seu pedido #${orderId}: status alterado para "${newStatus}". Acompanhe em ${origin}/meus-pedidos`;
            const waUrl = `https://api.whatsapp.com/send?phone=55${phoneRaw}&text=${encodeURIComponent(text)}`;
            toast.success("Status atualizado!", {
              action: {
                label: "Notificar via WhatsApp",
                onClick: () => window.open(waUrl, "_blank"),
              },
            });
            return;
          }
        }

        toast.success("Registro atualizado com sucesso!");
      } catch (err) {
        if (err instanceof InsufficientInventoryError) {
          toast.error("Filamento insuficiente", { description: err.shortages.join("; ") });
          return;
        }
        handleFirestoreError(err, OperationType.UPDATE, `${type}/${id}`);
      }
    },
    [fetchData, orders, selectedOrder, setSelectedOrder, selectedCustomer, setSelectedCustomer],
  );

  const moveToTrash = useCallback(
    async (type: string, id: string, notify = true, refresh = true): Promise<boolean> => {
      try {
        const sourceRef = doc(db, type, id);
        const sourceSnap = await getDoc(sourceRef);
        if (!sourceSnap.exists()) throw new Error("Registro não encontrado.");
        const sourceData = sourceSnap.data();

        if (type === "orders") {
          const status = sourceData.status as OrderStatus;
          if (!DELETABLE_ORDER_STATUSES.has(status)) {
            if (notify) {
              toast.error("Este pedido não pode ser excluído nesta etapa", {
                description:
                  "Mova-o para Aguardando pagamento ou cancele-o primeiro. Etapas produtivas não retrocedem automaticamente para preservar o estoque.",
              });
            }
            return false;
          }
        }

        if (type === "quotes") {
          const convertedOrderId = sourceData.convertedOrderId as string | undefined;
          let linkedOrder = convertedOrderId
            ? orders.find((order) => order.id === convertedOrderId)
            : undefined;
          if (convertedOrderId && !linkedOrder) {
            const linkedSnapshot = await getDoc(doc(db, "orders", convertedOrderId));
            if (linkedSnapshot.exists()) {
              linkedOrder = { id: linkedSnapshot.id, ...linkedSnapshot.data() } as Order;
            }
          }
          if (linkedOrder && !DELETABLE_ORDER_STATUSES.has(linkedOrder.status)) {
            if (notify) {
              toast.error("Orçamento vinculado a um pedido em andamento", {
                description:
                  "Volte ou cancele o pedido vinculado antes de mover este orçamento para a lixeira.",
              });
            }
            return false;
          }
        }

        const trashRef = doc(collection(db, "trash"));
        const batch = writeBatch(db);
        batch.set(trashRef, {
          sourceCollection: type,
          originalId: id,
          label: recordLabel(type, id, sourceData),
          data: sourceData,
          deletedAt: serverTimestamp(),
          deletedBy: auth.currentUser?.email || auth.currentUser?.uid || null,
        });
        if (type === "orders" || type === "quotes") {
          batch.update(sourceRef, {
            status: type === "orders" ? "CANCELED" : "DISCARDED",
            _deleted: true,
            deletedAt: serverTimestamp(),
          });
        } else {
          batch.delete(sourceRef);
        }
        await batch.commit();
        if (type === "orders") setOrders((prev) => prev.filter((o) => o.id !== id));
        else if (type === "quotes") setQuotes((prev) => prev.filter((q) => q.id !== id));
        if (refresh) await fetchData();
        if (notify) toast.success("Item movido para a lixeira.");
        return true;
      } catch (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "permission-denied"
            ? "Sem permissão para excluir. Verifique as regras do Firestore."
            : e.message || "Erro ao excluir item.";
        if (notify) toast.error(msg);
        return false;
      }
    },
    [fetchData, orders, setOrders, setQuotes],
  );

  const deleteItem = useCallback(
    (type: string, id: string) => moveToTrash(type, id),
    [moveToTrash],
  );

  const deleteItems = useCallback(
    async (type: string, ids: string[]) => {
      let moved = 0;
      for (const id of ids) if (await moveToTrash(type, id, false, false)) moved += 1;
      if (moved) await fetchData();
      const blocked = ids.length - moved;
      if (moved)
        toast.success(`${moved} ${moved === 1 ? "item movido" : "itens movidos"} para a lixeira.`);
      if (blocked) {
        toast.warning(
          `${blocked} ${blocked === 1 ? "item não pôde" : "itens não puderam"} ser excluído(s).`,
          {
            description: "Pedidos em andamento e orçamentos vinculados foram preservados.",
          },
        );
      }
      return { moved, blocked };
    },
    [fetchData, moveToTrash],
  );

  const restoreTrashItem = useCallback(
    async (entry: TrashEntry) => {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, entry.sourceCollection, entry.originalId), entry.data);
        batch.delete(doc(db, "trash", entry.id));
        await batch.commit();
        setTrashItems((current) => current.filter((item) => item.id !== entry.id));
        await fetchData();
        toast.success("Item restaurado com sucesso.");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `trash/${entry.id}`);
      }
    },
    [fetchData, setTrashItems],
  );

  const permanentlyDeleteTrashItem = useCallback(
    async (entry: TrashEntry) => {
      try {
        const batch = writeBatch(db);
        if (entry.sourceCollection === "orders" || entry.sourceCollection === "quotes") {
          batch.delete(doc(db, entry.sourceCollection, entry.originalId));
        }
        batch.delete(doc(db, "trash", entry.id));
        await batch.commit();
        setTrashItems((current) => current.filter((item) => item.id !== entry.id));
        toast.success("Item excluído permanentemente.");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `trash/${entry.id}`);
      }
    },
    [setTrashItems],
  );

  const emptyTrashItems = useCallback(
    async (entries: TrashEntry[]) => {
      if (!entries.length) return;
      try {
        for (let offset = 0; offset < entries.length; offset += 400) {
          const batch = writeBatch(db);
          const chunk = entries.slice(offset, offset + 400);
          for (const entry of chunk) {
            if (entry.sourceCollection === "orders" || entry.sourceCollection === "quotes") {
              batch.delete(doc(db, entry.sourceCollection, entry.originalId));
            }
            batch.delete(doc(db, "trash", entry.id));
          }
          await batch.commit();
        }
        const deletedIds = new Set(entries.map((entry) => entry.id));
        setTrashItems((current) => current.filter((item) => !deletedIds.has(item.id)));
        toast.success(
          `${entries.length} ${entries.length === 1 ? "item excluído" : "itens excluídos"} definitivamente.`,
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, "trash");
      }
    },
    [setTrashItems],
  );

  const handleUpdateTracking = useCallback(async (id: string, trackingCode: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { trackingCode, updatedAt: serverTimestamp() });
      toast.success("Código de rastreio atualizado!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "orders");
    }
  }, []);

  return {
    updateStatus,
    deleteItem,
    deleteItems,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    emptyTrashItems,
    handleUpdateTracking,
  };
}
