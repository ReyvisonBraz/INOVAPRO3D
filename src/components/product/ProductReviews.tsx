import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, Trash2, LogIn, Send } from "lucide-react";
import { Stars } from "../ui/Stars";
import { useReviews } from "../../hooks/useReviews";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";

function relativeDate(seconds: number): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user, loginWithGoogle } = useAuth();
  const { reviews, loading, average, count, myReview, submit, removeMine } = useReviews(productId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const startForm = () => {
    setRating(myReview?.rating ?? 0);
    setComment(myReview?.comment ?? "");
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Escolha de 1 a 5 estrelas.");
      return;
    }
    setSending(true);
    try {
      await submit(rating, comment);
      toast.success("Avaliação publicada. Obrigado!");
      setFormOpen(false);
    } catch {
      toast.error("Não foi possível enviar sua avaliação.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      await removeMine();
      setFormOpen(false);
      setRating(0);
      setComment("");
      toast.success("Avaliação removida.");
    } catch {
      toast.error("Não foi possível remover.");
    }
  };

  return (
    <section id="avaliacoes" className="mt-16 sm:mt-24 scroll-mt-28">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Avaliações</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 items-start">
        {/* Resumo / média */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center lg:sticky lg:top-28">
          {count > 0 ? (
            <>
              <p className="font-display text-5xl font-black text-white leading-none">{average.toFixed(1)}</p>
              <Stars value={average} size="w-5 h-5" className="mt-2 justify-center" />
              <p className="mt-2 text-xs text-white/40">
                {count} avaliação{count > 1 ? "ões" : ""}
              </p>
            </>
          ) : (
            <>
              <Star className="w-8 h-8 text-white/15 mx-auto" />
              <p className="mt-3 text-sm font-bold text-white/60">Ainda sem avaliações</p>
              <p className="mt-1 text-xs text-white/35">Seja o primeiro a avaliar este produto.</p>
            </>
          )}

          {/* CTA avaliar */}
          {!formOpen && (
            user ? (
              <button
                onClick={startForm}
                className="mt-5 w-full h-11 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all"
              >
                {myReview ? "Editar minha avaliação" : "Avaliar produto"}
              </button>
            ) : (
              <button
                onClick={() => loginWithGoogle().catch(() => {})}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-white/12 bg-white/[0.03] text-white/70 text-[11px] font-black uppercase tracking-widest hover:bg-white/[0.07] hover:text-white transition-all"
              >
                <LogIn className="w-4 h-4" /> Entrar para avaliar
              </button>
            )
          )}
        </div>

        {/* Form + lista */}
        <div className="space-y-4">
          {formOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 space-y-4"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Sua nota</p>
                <Stars value={rating} onChange={setRating} size="w-7 h-7" />
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Conte como foi sua experiência com o produto (opcional)…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none focus:border-primary/50 placeholder:text-white/25"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="inline-flex items-center gap-2 h-11 rounded-xl bg-primary px-5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> {sending ? "Enviando…" : "Publicar avaliação"}
                </button>
                <button
                  onClick={() => setFormOpen(false)}
                  className="h-11 rounded-xl border border-white/12 px-4 text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                {myReview && (
                  <button
                    onClick={handleDelete}
                    className="ml-auto inline-flex items-center gap-1.5 h-11 rounded-xl border border-white/10 px-4 text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 hover:border-red-400/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="py-10 text-center text-xs text-white/30">Carregando avaliações…</div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-sm text-white/35">
              Nenhuma avaliação ainda.
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  {r.userPhoto ? (
                    <img src={r.userPhoto} alt="" className="h-9 w-9 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 border border-primary/20 text-xs font-black text-primary">
                      {(r.userName || "C")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white/90 truncate">{r.userName || "Cliente"}</p>
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} size="w-3 h-3" />
                      <span className="text-[10px] text-white/30">{relativeDate(r.createdAt && "seconds" in r.createdAt ? r.createdAt.seconds : 0)}</span>
                    </div>
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-sm leading-relaxed text-white/60">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductReviews;
