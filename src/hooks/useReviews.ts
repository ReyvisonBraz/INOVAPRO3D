import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, setDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import type { Review, ReviewVote } from "../types/domain";

function secondsOf(d?: Review["createdAt"]): number {
  return d && typeof d === "object" && "seconds" in d ? (d as { seconds: number }).seconds : 0;
}

export interface VoteStat {
  up: number;
  down: number;
  mine: 0 | 1 | -1;
}

/** Avaliações de um produto: lista, média, votos "útil/não útil" e denúncia. */
export function useReviews(productId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [votes, setVotes] = useState<ReviewVote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [reviewSnap, voteSnap] = await Promise.all([
        getDocs(query(collection(db, "reviews"), where("productId", "==", productId))),
        getDocs(query(collection(db, "reviewVotes"), where("productId", "==", productId))),
      ]);
      const items = reviewSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Review))
        .filter((r) => !r.hidden); // ocultadas pelo admin não aparecem
      items.sort((a, b) => secondsOf(b.createdAt) - secondsOf(a.createdAt));
      setReviews(items);
      setVotes(voteSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewVote)));
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

  // Contagem de votos por avaliação + o voto do usuário atual.
  const voteStats = useMemo(() => {
    const uid = auth.currentUser?.uid;
    const map = new Map<string, VoteStat>();
    for (const v of votes) {
      const s = map.get(v.reviewId) ?? { up: 0, down: 0, mine: 0 };
      if (v.value === 1) s.up += 1;
      else if (v.value === -1) s.down += 1;
      if (uid && v.userId === uid) s.mine = v.value;
      map.set(v.reviewId, s);
    }
    return map;
  }, [votes]);

  const submit = useCallback(
    async (rating: number, comment: string) => {
      const u = auth.currentUser;
      if (!u || !productId) throw new Error("É preciso entrar para avaliar.");
      const id = `${productId}_${u.uid}`; // 1 avaliação por usuário/produto
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

  /** Vota "útil" (1) ou "não útil" (-1). Clicar de novo no mesmo remove o voto. */
  const vote = useCallback(
    async (reviewId: string, value: 1 | -1) => {
      const u = auth.currentUser;
      if (!u || !productId) throw new Error("Entre para votar.");
      const id = `${reviewId}__${u.uid}`;
      const current = voteStats.get(reviewId)?.mine ?? 0;
      if (current === value) {
        await deleteDoc(doc(db, "reviewVotes", id)); // toggle off
      } else {
        await setDoc(doc(db, "reviewVotes", id), {
          reviewId,
          productId,
          userId: u.uid,
          value,
          createdAt: serverTimestamp(),
        });
      }
      await load();
    },
    [productId, voteStats, load],
  );

  const report = useCallback(
    async (reviewId: string, reason?: string) => {
      const u = auth.currentUser;
      if (!u || !productId) throw new Error("Entre para denunciar.");
      const id = `${reviewId}__${u.uid}`;
      await setDoc(doc(db, "reviewReports", id), {
        reviewId,
        productId,
        reporterId: u.uid,
        reason: reason?.trim() || null,
        createdAt: serverTimestamp(),
      });
    },
    [productId],
  );

  return { reviews, loading, average, count, myReview, voteStats, submit, removeMine, vote, report, reload: load };
}
