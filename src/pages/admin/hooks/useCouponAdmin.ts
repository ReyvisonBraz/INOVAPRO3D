import { useCallback, useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "../../../services/firebase";
import type { Coupon } from "../../../types/domain";

export interface NewCouponForm {
  code: string;
  type: "percentage" | "fixed";
  value: string;
  minOrderValue: string;
  maxUses: string;
  description: string;
  expiresAt: string;
}

const EMPTY_FORM: NewCouponForm = {
  code: "", type: "percentage", value: "", minOrderValue: "",
  maxUses: "", description: "", expiresAt: "",
};

export function useCouponAdmin(fetchData: () => Promise<void>) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<NewCouponForm>(EMPTY_FORM);

  const openForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setIsAdding(true);
  }, []);

  const handleCreate = useCallback(async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { toast.error("Informe o código do cupom."); return; }
    const value = parseFloat(form.value);
    if (!value || value <= 0) { toast.error("Informe um valor válido."); return; }
    if (form.type === "percentage" && value > 100) { toast.error("Percentual máximo: 100%."); return; }

    try {
      await addDoc(collection(db, "coupons"), {
        code,
        type: form.type,
        value,
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        usedCount: 0,
        description: form.description.trim() || null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        active: true,
        createdAt: serverTimestamp(),
      });
      toast.success("Cupom criado!");
      setIsAdding(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch {
      toast.error("Erro ao criar cupom.");
    }
  }, [form, fetchData]);

  const handleToggle = useCallback(async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, "coupons", coupon.id), { active: !coupon.active });
      toast.success(coupon.active ? "Cupom desativado." : "Cupom ativado.");
      fetchData();
    } catch {
      toast.error("Erro ao atualizar cupom.");
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (couponId: string) => {
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      toast.success("Cupom excluído.");
      fetchData();
    } catch {
      toast.error("Erro ao excluir cupom.");
    }
  }, [fetchData]);

  return {
    isAdding, setIsAdding,
    form, setForm,
    openForm,
    handleCreate,
    handleToggle,
    handleDelete,
  };
}
