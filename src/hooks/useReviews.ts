import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, setDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import type { Review } from "../types/domain";

function secondsOf(d?: Review["createdAt"]): number {
  return d && typeof d === "object" && "seconds" in d ? (d as { seconds: number }).seconds : 0;
}

/** Avaliações de um produto: lista, média, a do próprio usuário, enviar e remover. */
export function useReviews(productId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      // Sem orderBy → evita exigir índice composto; ordenamos no cliente.
      const snap = await getDocs(query(collection(db, "reviews"), where("productId", "==", productId)));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      items.sort((a, b) => secondsOf(b.createdAt) - secondsOf(a.createdAt));
      setReviews(items);
    } catch (err) {
      console.error("[useReviews] falha ao carregar:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const { average, count } = useMemo(() => {
    if (!reviews.length) return { average: 0, count: 0 };
    return {
      average: reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length,
      count: reviews.length,
    };
  }, [reviews]);

  const myReview = useMemo(
    () => reviews.find((r) => r.userId === auth.currentUser?.uid) ?? null,
    [reviews],
  );

  const submit = useCallback(
    async (rating: number, comment: string) => {
      const u = auth.currentUser;
      if (!u || !productId) throw new Error("É preciso entrar para avaliar.");
      const id = `${productId}_${u.uid}`; // determinístico → 1 avaliação por usuário/produto
      await setDoc(doc(db, "reviews", id), {
        productId,
        userId: u.uid,
        userName: u.displayName || u.email?.split("@")[0] || "Cliente",
        userPhoto: u.photoURL || null,
        rating,
        comment: comment.trim() || null,
        createdAt: serverTimestamp(),
      });
      await load();
    },
    [productId, load],
  );

  const removeMine = useCallback(async () => {
    const u = auth.currentUser;
    if (!u || !productId) return;
    await deleteDoc(doc(db, "reviews", `${productId}_${u.uid}`));
    await load();
  }, [productId, load]);

  return { reviews, loading, average, count, myReview, submit, removeMine, reload: load };
}
