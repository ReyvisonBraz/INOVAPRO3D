import { useCallback, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Coupon } from "../types/domain";

interface CouponState {
  coupon: Coupon | null;
  discount: number;
  error: string | null;
  loading: boolean;
}

export function useCoupon(orderTotal: number) {
  const [state, setState] = useState<CouponState>({
    coupon: null,
    discount: 0,
    error: null,
    loading: false,
  });
  const [code, setCode] = useState("");

  const apply = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const snap = await getDocs(
        query(collection(db, "coupons"), where("code", "==", trimmed), where("active", "==", true))
      );

      if (snap.empty) {
        setState(s => ({ ...s, loading: false, error: "Cupom inválido ou inativo." }));
        return;
      }

      const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;

      if (coupon.expiresAt) {
        const expiry = (coupon.expiresAt as any).toDate?.() ?? new Date(coupon.expiresAt as any);
        if (expiry < new Date()) {
          setState(s => ({ ...s, loading: false, error: "Este cupom já expirou." }));
          return;
        }
      }

      if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
        setState(s => ({
          ...s, loading: false,
          error: `Valor mínimo para este cupom: R$ ${coupon.minOrderValue!.toFixed(2).replace(".", ",")}`,
        }));
        return;
      }

      if (coupon.maxUses != null && (coupon.usedCount ?? 0) >= coupon.maxUses) {
        setState(s => ({ ...s, loading: false, error: "Este cupom atingiu o limite de usos." }));
        return;
      }

      const discount =
        coupon.type === "percentage"
          ? Math.min(orderTotal * (coupon.value / 100), orderTotal)
          : Math.min(coupon.value, orderTotal);

      setState({ coupon, discount, error: null, loading: false });
    } catch {
      setState(s => ({ ...s, loading: false, error: "Erro ao validar cupom. Tente novamente." }));
    }
  }, [code, orderTotal]);

  const clear = useCallback(() => {
    setState({ coupon: null, discount: 0, error: null, loading: false });
    setCode("");
  }, []);

  return { code, setCode, apply, clear, ...state };
}
