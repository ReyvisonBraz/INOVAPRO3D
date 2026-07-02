import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  EyeOff,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  Inbox,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { doc, updateDoc, deleteDoc, orderBy, limit } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { useFirestoreCollection } from "../../../hooks/useFirestoreCollection";
import { Stars } from "../../../components/ui/Stars";
import { cn } from "../../../lib/utils";
import type { Review, ReviewReport, ReviewVote } from "../../../types/domain";
import { toast } from "sonner";

type FilterId = "reported" | "hidden" | "all";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "reported", label: "Denunciadas" },
  { id: "hidden", label: "Ocultas" },
  { id: "all", label: "Todas" },
];

function secondsOf(d?: Review["createdAt"]): number {
  return d && typeof d === "object" && "seconds" in d ? (d as { seconds: number }).seconds : 0;
}
function fmtDate(sec: number): string {
  return sec ? new Date(sec * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "danger" | "warn" | "muted" }) {
  const color = tone === "danger" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-white";
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}

const AdminReviewsPanel = memo(function AdminReviewsPanel() {
  const { data: reviews, setData: setReviews, loading, refetch } = useFirestoreCollection<Review>("reviews", {
    constraints: [orderBy("createdAt", "desc"), limit(500)],
  });
  const { data: reports, setData: setReports } = useFirestoreCollection<ReviewReport>("reviewReports", { silent: true });
  const { data: votes } = useFirestoreCollection<ReviewVote>("reviewVotes", { silent: true });

  const [filter, setFilter] = useState<FilterId>("reported");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reportCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reports) m.set(r.reviewId, (m.get(r.reviewId) ?? 0) + 1);
    return m;
  }, [reports]);

  const voteAgg = useMemo(() => {
    const m = new Map<string, { up: number; down: number }>();
    for (const v of votes) {
      const s = m.get(v.reviewId) ?? { up: 0, down: 0 };
      if (v.value === 1) s.up++;
      else if (v.value === -1) s.down++;
      m.set(v.reviewId, s);
    }
    return m;
  }, [votes]);

  const stats = useMemo(() => {
    const reported = reviews.filter((r) => (reportCount.get(r.id) ?? 0) > 0).length;
    const hidden = reviews.filter((r) => r.hidden).length;
    const avg = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;
    return { total: reviews.length, reported, hidden, avg };
  }, [reviews, reportCount]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = reviews.filter((r) => {
      if (filter === "reported" && (reportCount.get(r.id) ?? 0) === 0) return false;
      if (filter === "hidden" && !r.hidden) return false;
      if (!term) return true;
      return [r.comment, r.userName, r.productId].filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
    });
    // denunciadas primeiro, depois mais recentes
    return list.sort((a, b) => {
      const ra = reportCount.get(a.id) ?? 0;
      const rb = reportCount.get(b.id) ?? 0;
      if (rb !== ra) return rb - ra;
      return secondsOf(b.createdAt) - secondsOf(a.createdAt);
    });
  }, [reviews, filter, search, reportCount]);

  const toggleHide = async (r: Review) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, "reviews", r.id), { hidden: !r.hidden });
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: !r.hidden } : x)));
      toast.success(!r.hidden ? "Avaliação ocultada da loja." : "Avaliação reexibida.");
    } catch {
      toast.error("Falha ao atualizar (publique as regras do Firestore).");
    } finally {
      setBusyId(null);
    }
  };

  const dismissReports = async (reviewId: string) => {
    const toDelete = reports.filter((rp) => rp.reviewId === reviewId);
    try {
      await Promise.all(toDelete.map((rp) => deleteDoc(doc(db, "reviewReports", rp.id))));
      setReports((prev) => prev.filter((rp) => rp.reviewId !== reviewId));
      toast.success("Denúncias descartadas.");
    } catch {
      toast.error("Falha ao descartar denúncias.");
    }
  };

  const remove = async (r: Review) => {
    setBusyId(r.id);
    try {
      await deleteDoc(doc(db, "reviews", r.id));
      const toDelete = reports.filter((rp) => rp.reviewId === r.id);
      await Promise.all(toDelete.map((rp) => deleteDoc(doc(db, "reviewReports", rp.id)).catch(() => {})));
      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      setReports((prev) => prev.filter((rp) => rp.reviewId !== r.id));
      toast.success("Avaliação excluída.");
    } catch {
      toast.error("Falha ao excluir.");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} tone="muted" />
        <StatCard label="Denunciadas" value={stats.reported} tone="danger" />
        <StatCard label="Ocultas" value={stats.hidden} tone="warn" />
        <StatCard label="Nota média" value={stats.total ? stats.avg.toFixed(1) : "—"} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const c = f.id === "reported" ? stats.reported : f.id === "hidden" ? stats.hidden : stats.total;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-xl px-3 py-2 text-[11px] font-bold transition-colors",
                  filter === f.id ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white hover:bg-white/[0.04]",
                )}
              >
                {f.label} <span className="ml-1 text-white/30 tabular-nums">{c}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 h-9 w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-white/35 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comentário, cliente…"
              className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-white/30"
            />
          </div>
          <button
            onClick={refetch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white transition-all"
            title="Atualizar"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Inbox className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-sm font-bold text-white/40">
            {filter === "reported" ? "Nenhuma avaliação denunciada. 🎉" : "Nenhuma avaliação neste filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const nReports = reportCount.get(r.id) ?? 0;
            const va = voteAgg.get(r.id) ?? { up: 0, down: 0 };
            const sec = secondsOf(r.createdAt);
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-2xl border p-4",
                  nReports > 0 ? "border-red-400/25 bg-red-400/[0.04]" : r.hidden ? "border-white/[0.05] bg-white/[0.01] opacity-70" : "border-white/[0.08] bg-white/[0.02]",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 border border-primary/20 text-xs font-black text-primary">
                    {(r.userName || "C")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white/90 truncate">{r.userName || "Cliente"}</span>
                      <Stars value={r.rating} size="w-3 h-3" />
                      <span className="text-[10px] text-white/30">{fmtDate(sec)}</span>
                      {r.hidden && (
                        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/50">Oculta</span>
                      )}
                      {nReports > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-300">
                          <Flag className="w-2.5 h-2.5" /> {nReports} denúncia{nReports > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {r.comment && <p className="mt-2 text-sm leading-relaxed text-white/60 break-words">{r.comment}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/35">
                      <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {va.up}</span>
                      <span className="inline-flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {va.down}</span>
                      <a
                        href={`/produto/${r.productId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> ver produto
                      </a>
                    </div>

                    {/* Ações */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleHide(r)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/55 hover:text-white hover:bg-white/[0.05] transition-all disabled:opacity-50"
                      >
                        {r.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {r.hidden ? "Reexibir" : "Ocultar"}
                      </button>

                      {nReports > 0 && (
                        <button
                          onClick={() => dismissReports(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/55 hover:text-green-300 hover:border-green-400/20 transition-all"
                        >
                          <ShieldCheck className="w-3 h-3" /> Ignorar denúncias
                        </button>
                      )}

                      {confirmDelete === r.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => remove(r)}
                            disabled={busyId === r.id}
                            className="rounded-lg bg-red-500/20 border border-red-500/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                          >
                            Confirmar exclusão
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40 hover:text-white transition-all"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40 hover:text-red-400 hover:border-red-400/20 transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

export default AdminReviewsPanel;
