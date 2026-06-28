import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bug,
  User,
  Clock,
  Route as RouteIcon,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Copy,
  Check,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { doc, updateDoc, deleteDoc, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { useFirestoreCollection } from "../../../hooks/useFirestoreCollection";
import { cn } from "../../../lib/utils";
import type { ErrorReport } from "../../../types/domain";
import { toast } from "sonner";

type FilterId = "open" | "reported" | "resolved" | "all";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "open", label: "Abertos" },
  { id: "reported", label: "Reportados" },
  { id: "resolved", label: "Resolvidos" },
  { id: "all", label: "Todos" },
];

function secondsOf(d?: { seconds: number } | unknown): number {
  return d && typeof d === "object" && "seconds" in d ? (d as { seconds: number }).seconds : 0;
}

function timeAgo(seconds: number): string {
  if (!seconds) return "—";
  const diff = Date.now() - seconds * 1000;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warn" | "ok" | "muted" }) {
  const color =
    tone === "danger" ? "text-red-400" : tone === "warn" ? "text-amber-400" : tone === "ok" ? "text-green-400" : "text-white";
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}

const AdminErrorReportsPanel = memo(function AdminErrorReportsPanel() {
  const { data, setData, loading, error, refetch } = useFirestoreCollection<ErrorReport>("errorReports", {
    constraints: [orderBy("createdAt", "desc"), limit(300)],
  });

  const [filter, setFilter] = useState<FilterId>("open");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const dayAgo = Date.now() - 24 * 3600 * 1000;
    return {
      total: data.length,
      open: data.filter((r) => !r.resolved).length,
      reported: data.filter((r) => r.userReported).length,
      today: data.filter((r) => secondsOf(r.createdAt) * 1000 >= dayAgo).length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((r) => {
      if (filter === "open" && r.resolved) return false;
      if (filter === "resolved" && !r.resolved) return false;
      if (filter === "reported" && !r.userReported) return false;
      if (!term) return true;
      return [r.message, r.route, r.where, r.userEmail, r.userNote]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, filter, search]);

  const toggleResolved = async (r: ErrorReport) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, "errorReports", r.id), { resolved: !r.resolved, updatedAt: serverTimestamp() });
      setData((prev) => prev.map((x) => (x.id === r.id ? { ...x, resolved: !r.resolved } : x)));
      toast.success(!r.resolved ? "Marcado como resolvido." : "Reaberto.");
    } catch {
      toast.error("Falha ao atualizar. Verifique as permissões (deploy das regras).");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: ErrorReport) => {
    setBusyId(r.id);
    try {
      await deleteDoc(doc(db, "errorReports", r.id));
      setData((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Relato excluído.");
    } catch {
      toast.error("Falha ao excluir.");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  const copyDetails = async (r: ErrorReport) => {
    const text = [
      `Mensagem: ${r.message || "—"}`,
      `Onde: ${r.where || "—"}`,
      `Rota: ${r.route || "—"}`,
      `Usuário: ${r.userEmail || "anônimo"}`,
      `Versão: ${r.appVersion || "—"}`,
      r.userNote ? `Relato do usuário: ${r.userNote}` : "",
      `UserAgent: ${r.userAgent || "—"}`,
      "",
      `Stack:\n${r.stack || "—"}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <motion.div key="error-reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} tone="muted" />
        <StatCard label="Abertos" value={stats.open} tone="danger" />
        <StatCard label="Reportados por usuário" value={stats.reported} tone="warn" />
        <StatCard label="Últimas 24h" value={stats.today} tone="ok" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count =
              f.id === "open" ? stats.open : f.id === "reported" ? stats.reported : f.id === "resolved" ? data.filter((r) => r.resolved).length : stats.total;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-xl px-3 py-2 text-[11px] font-bold transition-colors",
                  filter === f.id ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white hover:bg-white/[0.04]",
                )}
              >
                {f.label} <span className="ml-1 text-white/30 tabular-nums">{count}</span>
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
              placeholder="Buscar mensagem, rota, e-mail…"
              className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-white/30"
            />
          </div>
          <button
            onClick={refetch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white hover:border-white/20 transition-all"
            title="Atualizar"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Lista */}
      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-300">Não foi possível carregar os relatos.</p>
          <p className="text-xs text-white/40 mt-1">
            Confirme que as regras do Firestore foram publicadas (a coleção <code>errorReports</code> exige admin).
          </p>
        </div>
      ) : loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Inbox className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-sm font-bold text-white/40">
            {data.length === 0 ? "Nenhum erro registrado. 🎉" : "Nenhum relato neste filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const sec = secondsOf(r.createdAt);
            const isOpen = expanded === r.id;
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-2xl border bg-white/[0.02] transition-colors",
                  r.resolved ? "border-white/[0.05] opacity-65" : "border-white/[0.08]",
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Ícone tipo */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                      r.userReported
                        ? "border-amber-400/25 bg-amber-400/10 text-amber-400"
                        : "border-red-400/25 bg-red-400/10 text-red-400",
                    )}
                  >
                    {r.userReported ? <User className="w-4 h-4" /> : <Bug className="w-4 h-4" />}
                  </div>

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
                        {r.where || "—"}
                      </span>
                      {r.userReported && (
                        <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                          Reportado
                        </span>
                      )}
                      {r.resolved && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green-400">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Resolvido
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-white/30 tabular-nums" title={sec ? new Date(sec * 1000).toLocaleString("pt-BR") : ""}>
                        <Clock className="w-3 h-3" /> {timeAgo(sec)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm font-semibold text-white/90 break-words">
                      {r.message || "(sem mensagem)"}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40">
                      {r.route && (
                        <span className="flex items-center gap-1 font-mono">
                          <RouteIcon className="w-3 h-3" /> {r.route}
                        </span>
                      )}
                      {r.userEmail && <span className="truncate">👤 {r.userEmail}</span>}
                      {r.appVersion && <span className="text-white/25">{r.appVersion}</span>}
                    </div>

                    {r.userNote && (
                      <div className="mt-2.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-2.5 text-xs text-amber-100/80">
                        <span className="font-bold text-amber-300">Relato do cliente: </span>
                        {r.userNote}
                      </div>
                    )}

                    {/* Stack expansível */}
                    {r.stack && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
                      >
                        Detalhes técnicos
                        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    )}
                    {isOpen && r.stack && (
                      <pre className="mt-2 max-h-60 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[10px] leading-relaxed text-red-400/70 whitespace-pre-wrap break-all">
                        {r.stack}
                        {r.userAgent ? `\n\n— ${r.userAgent}` : ""}
                      </pre>
                    )}

                    {/* Ações */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleResolved(r)}
                        disabled={busyId === r.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-50",
                          r.resolved
                            ? "border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.05]"
                            : "bg-green-500/15 text-green-300 border border-green-500/20 hover:bg-green-500/25",
                        )}
                      >
                        {r.resolved ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {r.resolved ? "Reabrir" : "Resolver"}
                      </button>

                      <button
                        onClick={() => copyDetails(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
                      >
                        {copiedId === r.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === r.id ? "Copiado" : "Copiar"}
                      </button>

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

export default AdminErrorReportsPanel;
