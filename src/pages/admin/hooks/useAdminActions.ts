import { Dispatch, SetStateAction, useCallback } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { db, handleFirestoreError, OperationType } from "../../../services/firebase";
import type { Order, Quote, Ticket } from "../../../types/domain";

interface Deps {
  orders: Order[];
  fetchData: () => Promise<void>;
  selectedOrder: Order | null;
  setSelectedOrder: Dispatch<SetStateAction<Order | null>>;
  selectedCustomer: Quote | Ticket | null;
  setSelectedCustomer: Dispatch<SetStateAction<Quote | Ticket | null>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
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
}: Deps) {
  const updateStatus = useCallback(
    async (type: string, id: string, newStatus: string | Record<string, unknown>) => {
      try {
        const payload = typeof newStatus === "object" ? newStatus : { status: newStatus };
        await updateDoc(doc(db, type, id), payload);
        fetchData();
        if (type === "orders" && selectedOrder?.id === id) {
          setSelectedOrder((prev) => (prev ? { ...prev, ...payload } : null));
        }
        if (type === "quotes" && selectedCustomer?.id === id) {
          setSelectedCustomer((prev) => (prev ? { ...prev, ...payload } : null));
        }

        if (type === "orders" && typeof newStatus === "string") {
          const order = orders.find(o => o.id === id) ?? selectedOrder;
          const phoneRaw = (order?.phone ?? "").replace(/\D/g, "");
          if (phoneRaw.length >= 10) {
            const orderId = id.slice(0, 8).toUpperCase();
            const origin = window.location.origin;
            const STATUS_MESSAGES: Partial<Record<string, string>> = {
              PAID:      `✅ Pagamento confirmado! Seu pedido #${orderId} foi aprovado e já entrou na fila de produção. Acompanhe em ${origin}/meus-pedidos`,
              QUEUE:     `🖨️ Seu pedido #${orderId} entrou na fila de impressão! Acompanhe em ${origin}/meus-pedidos`,
              PRINTING:  `⚡ Impressão iniciada! Seu pedido #${orderId} está sendo fabricado agora. Acompanhe em ${origin}/meus-pedidos`,
              FINISHING: `🔧 Acabamento em andamento! Seu pedido #${orderId} está na fase de finalização.`,
              SHIPPED:   `🚚 Pedido enviado! Seu pedido #${orderId} está a caminho. Acompanhe em ${origin}/meus-pedidos`,
              COMPLETED: `✅ Pedido entregue! Obrigado por escolher a INOVAPRO3D. Seu pedido #${orderId} foi concluído com sucesso! ⭐`,
              CANCELED:  `❌ Seu pedido #${orderId} foi cancelado. Em caso de dúvidas, entre em contato conosco.`,
            };
            const text = STATUS_MESSAGES[newStatus] ?? `📦 Atualização do seu pedido #${orderId}: status alterado para "${newStatus}". Acompanhe em ${origin}/meus-pedidos`;
            const waUrl = `https://api.whatsapp.com/send?phone=55${phoneRaw}&text=${encodeURIComponent(text)}`;
            toast.success("Status atualizado!", {
              action: { label: "Notificar via WhatsApp", onClick: () => window.open(waUrl, "_blank") },
            });
            return;
          }
        }

        toast.success("Registro atualizado com sucesso!");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${type}/${id}`);
      }
    },
    [fetchData, orders, selectedOrder, setSelectedOrder, selectedCustomer, setSelectedCustomer]
  );

  const deleteItem = useCallback(
    async (type: string, id: string) => {
      try {
        if (type === "orders" || type === "quotes") {
          await updateDoc(doc(db, type, id), { status: type === "orders" ? "CANCELED" : "DISCARDED", _deleted: true, deletedAt: serverTimestamp() });
          if (type === "orders") setOrders(prev => prev.filter(o => o.id !== id));
          if (type === "quotes") setQuotes(prev => prev.filter(q => q.id !== id));
        } else {
          await deleteDoc(doc(db, type, id));
          await fetchData();
        }
        toast.success("Item excluído com sucesso!");
      } catch (err: any) {
        const msg = err?.code === "permission-denied"
          ? "Sem permissão para excluir. Verifique as regras do Firestore."
          : err?.message || "Erro ao excluir item.";
        toast.error(msg);
      }
    },
    [fetchData, setOrders, setQuotes]
  );

  const handleUpdateTracking = useCallback(async (id: string, trackingCode: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { trackingCode, updatedAt: serverTimestamp() });
      toast.success("Código de rastreio atualizado!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "orders");
    }
  }, []);

  return { updateStatus, deleteItem, handleUpdateTracking };
}
