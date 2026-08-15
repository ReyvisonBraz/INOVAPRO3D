import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { isFinalPaymentStatus } from "../../shared/payments/paymentStateMachine";
import type { OrderStatus, PaymentStatus } from "../types/domain";
import { auth, db } from "../services/firebase";

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting";

export interface OrderPaymentStatus {
  paymentStatus: PaymentStatus | null;
  orderStatus: OrderStatus | null;
  /** `true` quando o pagamento não pode mais mudar (aprovado, vencido, recusado...). */
  isFinal: boolean;
  connectionState: ConnectionState;
  /** Mensagem apresentável quando a assinatura em tempo real falha. */
  error: string | null;
}

const IDLE_STATUS: OrderPaymentStatus = {
  paymentStatus: null,
  orderStatus: null,
  isFinal: false,
  connectionState: "idle",
  error: null,
};

const MIN_REVALIDATE_INTERVAL_MS = 15_000;

/** Evita disparar a API a cada foco/reconexão em sequência rápida. */
export function shouldRevalidate(lastRevalidateAt: number, now: number): boolean {
  return now - lastRevalidateAt >= MIN_REVALIDATE_INTERVAL_MS;
}

/**
 * Acompanha o estado financeiro de um pedido em tempo real. A fonte primária é
 * uma assinatura de um único documento do Firestore — sem polling, sem
 * consumir a coleção inteira. A assinatura é encerrada assim que o pagamento
 * chega a um estado final e sempre ao desmontar o componente.
 *
 * Como reforço, revalida pela API (`/api/mercadopago/payment-status`) ao
 * recuperar foco ou conexão: cobre o caso raro de a aba ter perdido eventos
 * do Firestore enquanto estava suspensa.
 */
export function useOrderPaymentStatus(
  orderId: string | null,
  { enabled = true }: { enabled?: boolean } = {},
): OrderPaymentStatus {
  const [status, setStatus] = useState<OrderPaymentStatus>(IDLE_STATUS);
  const lastRevalidateRef = useRef(0);
  const isFinalRef = useRef(false);

  const revalidate = useCallback(async () => {
    if (!orderId || isFinalRef.current) return;
    const now = Date.now();
    if (!shouldRevalidate(lastRevalidateRef.current, now)) return;
    lastRevalidateRef.current = now;

    const user = auth.currentUser;
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `/api/mercadopago/payment-status?orderId=${encodeURIComponent(orderId)}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      if (!response.ok) return;
      const data = (await response.json()) as { paymentStatus?: PaymentStatus };
      // O listener do Firestore é a fonte principal; isto só corrige o raro
      // caso de a aba ter perdido eventos enquanto estava em segundo plano.
      if (data.paymentStatus) {
        setStatus((prev) => ({
          ...prev,
          paymentStatus: data.paymentStatus ?? prev.paymentStatus,
          isFinal: isFinalPaymentStatus(data.paymentStatus ?? "NOT_STARTED"),
        }));
      }
    } catch {
      // Silencioso: uma falha na revalidação não deve interromper o checkout,
      // o listener em tempo real continua tentando por conta própria.
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !enabled) {
      // Sincroniza com a ausência de pedido/etapa, não com uma mudança interna
      // de estado — não há como mover isto para um manipulador de evento.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(IDLE_STATUS);
      isFinalRef.current = false;
      return;
    }

    setStatus((prev) => ({ ...prev, connectionState: "connecting", error: null }));
    let cancelled = false;

    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        if (cancelled) return;
        if (!snapshot.exists()) {
          setStatus({
            paymentStatus: null,
            orderStatus: null,
            isFinal: false,
            connectionState: "connected",
            error: "Pedido não encontrado.",
          });
          return;
        }

        const data = snapshot.data();
        const paymentStatus: PaymentStatus = data.paymentStatus ?? "NOT_STARTED";
        const isFinal = isFinalPaymentStatus(paymentStatus);
        isFinalRef.current = isFinal;

        setStatus({
          paymentStatus,
          orderStatus: data.status ?? null,
          isFinal,
          connectionState: "connected",
          error: null,
        });

        // Nada mais muda depois de um estado final: encerrar aqui poupa a
        // quota do Firestore em vez de manter a assinatura aberta à toa.
        if (isFinal) unsubscribe();
      },
      () => {
        if (cancelled) return;
        setStatus((prev) => ({
          ...prev,
          connectionState: "reconnecting",
          error: "Não foi possível confirmar o pagamento em tempo real. Tentando novamente…",
        }));
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [orderId, enabled]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    const onFocusOrOnline = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    window.addEventListener("focus", onFocusOrOnline);
    window.addEventListener("online", onFocusOrOnline);
    document.addEventListener("visibilitychange", onFocusOrOnline);
    return () => {
      window.removeEventListener("focus", onFocusOrOnline);
      window.removeEventListener("online", onFocusOrOnline);
      document.removeEventListener("visibilitychange", onFocusOrOnline);
    };
  }, [enabled, orderId, revalidate]);

  return status;
}
