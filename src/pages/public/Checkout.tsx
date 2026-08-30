import { Fragment, useEffect, useRef, useState } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  Package,
  ChevronRight,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { auth } from "../../services/firebase";
import { toast } from "sonner";
import { trackBeginCheckout, trackPurchase } from "../../lib/analytics";
import { ApiClientError, formatSupportCode, readApiError } from "../../lib/apiError";
import { isEnabled as isMercadoPagoEnabled } from "../../lib/mercadopago/config";
import { usePayment } from "../../hooks/usePayment";
import { useOrderPaymentStatus } from "../../hooks/useOrderPaymentStatus";
import { PixPaymentStep, type PixPaymentData } from "../../components/checkout/PixPaymentStep";

interface OrderTotals {
  subtotal: number;
  discount: number;
  total: number;
}

export default function Checkout() {
  const { items, total, clearCart, updateQuantity, removeItem } = useCart();
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const mpEnabled = isMercadoPagoEnabled();
  const {
    loading: paymentLoading,
    error: paymentError,
    processPayment,
    reset: resetPayment,
  } = usePayment();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [confirmedTotals, setConfirmedTotals] = useState<OrderTotals | null>(null);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const checkoutTotal = confirmedTotals?.total ?? total;

  // Fonte da confirmação automática: assinatura em tempo real do pedido,
  // ativa somente durante a etapa de pagamento. Encerra sozinha em estado
  // final e ao sair da etapa (enabled passa a false).
  const paymentStatusRealtime = useOrderPaymentStatus(createdOrderId, {
    enabled: step === 2 && mpEnabled,
  });

  const trackedCheckout = useRef(false);
  const trackedPurchase = useRef(false);
  const lastTotalRef = useRef(0);
  useEffect(() => {
    if (total > 0) lastTotalRef.current = total;
  }, [total]);
  useEffect(() => {
    if (step >= 1 && items.length > 0 && !trackedCheckout.current) {
      trackedCheckout.current = true;
      trackBeginCheckout(lastTotalRef.current);
    }
  }, [step, items.length]);

  const ensureCheckoutUser = async () => {
    if (user) return user;
    try {
      setAuthLoading(true);
      await loginWithGoogle();
      const u = auth.currentUser;
      if (!u) {
        toast.error("Login não concluído.");
        return null;
      }
      toast.success("Login concluído!");
      return u;
    } catch {
      toast.error("Login cancelado.");
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    // Reforça o `disabled` do botão: nenhum disparo duplo entra, mesmo por
    // Enter repetido ou chamada programática, enquanto a anterior está em voo.
    if (loading) return;
    const checkoutUser = await ensureCheckoutUser();
    if (!checkoutUser) return;

    setLoading(true);
    try {
      const idToken = await checkoutUser.getIdToken();
      const payloadItems = items.map((i) => ({
        type: i.type,
        productId: i.productId,
        materialId: i.materialId,
        quantity: i.quantity,
      }));

      // Nome e e-mail não são enviados: o servidor os obtém do token verificado.
      const resp = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ items: payloadItems }),
      });
      if (!resp.ok) {
        throw await readApiError(resp, "Não foi possível gerar o pedido agora. Tente novamente.");
      }
      const order = (await resp.json()) as {
        orderId: string;
        subtotal: number;
        discount: number;
        total: number;
      };
      const { orderId, total: serverTotal } = order;

      // Só o `orderId`: destinatário, nome e total saem do pedido no servidor.
      fetch("/api/notify/new-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});

      setCreatedOrderId(orderId);
      setConfirmedTotals({
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
      });

      if (mpEnabled) {
        setStep(2);
      } else {
        if (!trackedPurchase.current) {
          trackedPurchase.current = true;
          trackPurchase(serverTotal, orderId);
        }
        setStep(3);
        clearCart();
        toast.success("Pedido recebido!", {
          description: "Entraremos em contato para combinar pagamento e entrega.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o pedido agora. Tente novamente.";
      const supportCode =
        error instanceof ApiClientError ? formatSupportCode(error.correlationId) : null;
      toast.error(message, {
        description: supportCode ? `Código de atendimento: ${supportCode}` : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!createdOrderId || !user || loading) return;

    setLoading(true);
    resetPayment();

    try {
      const result = await processPayment(createdOrderId);

      if (result.success) {
        if (result.pixCode) {
          setPixData({
            pixCode: result.pixCode,
            qrCodeBase64: result.qrCodeBase64,
            qrCodeUrl: result.qrCodeUrl,
            expiresAt: result.expiresAt,
            paymentId: result.paymentId,
          });
        } else if (result.status === "approved") {
          handlePaymentSuccess(result.paymentId);
        }
      }
    } catch {
      toast.error("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentId?: string) => {
    if (!trackedPurchase.current && createdOrderId) {
      trackedPurchase.current = true;
      trackPurchase(checkoutTotal, createdOrderId);
    }
    setStep(3);
    clearCart();
    toast.success("Pagamento aprovado!", {
      description: `Pedido confirmado. ${paymentId ? `ID: ${paymentId}` : ""}`,
    });
  };

  // O QR Code some sozinho quando o webhook confirma o pagamento — a pessoa
  // não precisa recarregar a página nem clicar em nada.
  useEffect(() => {
    if (step === 2 && paymentStatusRealtime.paymentStatus === "APPROVED") {
      handlePaymentSuccess(pixData?.paymentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentStatusRealtime.paymentStatus]);

  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      toast.success("Código Pix copiado!");
    }
  };

  if (items.length === 0 && step !== 3) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8">
          <Package className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-black mb-4 uppercase tracking-tight">
          Seu carrinho está vazio
        </h2>
        <p className="text-white/40 mb-12 font-medium">
          Adicione um produto ao carrinho para finalizar seu pedido.
        </p>
        <Button
          onClick={() => navigate("/catalogo")}
          size="lg"
          className="h-16 px-10 rounded-2xl gap-2 font-black uppercase"
        >
          EXPLORAR CATÁLOGO <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const steps = mpEnabled
    ? [
        { n: 1 as const, label: "Revisão" },
        { n: 2 as const, label: "Pagamento" },
        { n: 3 as const, label: "Confirmado" },
      ]
    : [
        { n: 1 as const, label: "Revisão" },
        { n: 3 as const, label: "Pedido recebido" },
      ];

  return (
    <div className="px-5 lg:px-12 py-8 sm:py-12 max-w-7xl mx-auto min-h-screen">
      <PageSEO
        title="Finalizar Pedido"
        description="Confirme seu pedido de impressão 3D com pagamento seguro."
        path="/checkout"
        noindex
      />
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-8 sm:mb-10 gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display uppercase tracking-tight mb-2 leading-none">
            {step === 1 ? (
              <>
                Revise seu <span className="text-shimmer italic">pedido.</span>
              </>
            ) : step === 2 ? (
              <>
                Escolha o <span className="text-shimmer italic">pagamento.</span>
              </>
            ) : (
              <>
                Pedido <span className="text-shimmer italic">confirmado.</span>
              </>
            )}
          </h1>
          <p className="text-white/40 font-medium text-sm sm:text-base">
            {step === 1
              ? "Revise os itens e confirme seu pedido."
              : step === 2
                ? "Gere o Pix e pague com segurança pelo aplicativo do seu banco."
                : "Seu pedido foi registrado com sucesso."}
          </p>
        </div>
        <nav
          aria-label="Etapas do pedido"
          className="flex items-center gap-3 sm:gap-4 bg-white/[0.03] p-4 sm:p-0 sm:bg-transparent rounded-3xl border border-white/5 sm:border-0"
        >
          <ol className="flex items-center gap-3 sm:gap-4">
            {steps.map(({ n: s, label }, idx) => (
              <Fragment key={s}>
                <li
                  aria-current={step === s ? "step" : undefined}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    aria-hidden="true"
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-sm sm:text-base font-black transition-all ${
                      step === s
                        ? "bg-primary text-white scale-110 shadow-xl shadow-primary/20"
                        : step > s
                          ? "bg-green-500 text-white"
                          : "bg-white/5 text-white/20"
                    }`}
                  >
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : `0${s}`}
                  </div>
                  {/* `sr-only` mantém o rótulo audível por leitor de tela no celular; `hidden`
                      o removeria da árvore de acessibilidade, não só da tela. O estado
                      (concluída/atual) fica sempre só para leitor — visualmente já é a cor. */}
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest sr-only sm:not-sr-only ${step === s ? "text-primary" : step > s ? "text-green-500" : "text-white/20"}`}
                  >
                    {label}
                  </span>
                  <span className="sr-only">
                    {step > s ? " — concluída" : step === s ? " — etapa atual" : " — pendente"}
                  </span>
                </li>
                {idx < steps.length - 1 && (
                  <li
                    aria-hidden="true"
                    className={`w-6 sm:w-8 h-[2px] rounded-full mb-4 ${step > s ? "bg-green-500" : "bg-white/10"}`}
                  />
                )}
              </Fragment>
            ))}
          </ol>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-32 lg:pb-0">
        <div className="lg:col-span-8 order-2 lg:order-1">
          {step === 1 && (
            <div className="space-y-8">
              <section className="space-y-6">
                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                  <Package className="w-4 h-4" /> Revisar Pedido
                </h3>

                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 sm:gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          loading="lazy"
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate tracking-tight">{item.name}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            aria-label="Diminuir quantidade"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            aria-label="Aumentar quantidade"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label="Remover produto"
                            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-white/30 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-mono font-black text-white/70 shrink-0">
                        {(item.price * item.quantity).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {!mpEnabled && (
                <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/15 flex gap-4">
                  <MessageCircle className="w-6 h-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-black text-white uppercase tracking-widest">
                      Como funciona depois do pedido
                    </p>
                    <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                      Recebemos sua solicitação, confirmamos produção e entrega e enviamos as opções
                      de pagamento. Nenhuma cobrança acontece agora.
                    </p>
                  </div>
                </div>
              )}

              {!user && (
                <div className="p-5 rounded-[24px] bg-primary/5 border border-primary/15 flex gap-4">
                  <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                    Entre com Google para salvar e acompanhar o pedido em{" "}
                    <span className="text-white">Meus Pedidos</span>.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex-1 text-sm font-black uppercase tracking-widest border-white/10"
                  onClick={() => navigate("/catalogo")}
                >
                  Continuar Comprando
                </Button>
                <Button
                  isShimmer
                  size="lg"
                  loading={loading || authLoading}
                  className="h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex-[2] gap-4 text-lg sm:text-xl font-display font-black uppercase tracking-tight"
                  onClick={handleCompleteOrder}
                >
                  {user ? "CONTINUAR" : "ENTRAR E CONTINUAR"}{" "}
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && mpEnabled && (
            <PixPaymentStep
              payment={pixData}
              loading={loading || paymentLoading}
              onBack={() => setStep(1)}
              onGenerate={handleProcessPayment}
              onCopy={copyPixCode}
              onTrackOrder={() => {
                clearCart();
                navigate("/meus-pedidos");
              }}
              remoteStatus={paymentStatusRealtime.paymentStatus}
              connectionUnstable={paymentStatusRealtime.connectionState === "reconnecting"}
              error={paymentError}
            />
          )}

          {step === 3 && (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <div className="w-32 h-32 rounded-[40px] bg-primary text-white flex items-center justify-center relative border-4 border-white/10 shadow-2xl">
                  <CheckCircle2 className="w-16 h-16" />
                </div>
              </div>
              <h2 className="text-5xl lg:text-7xl font-display font-black mb-6 uppercase tracking-tighter leading-none">
                {mpEnabled ? "Pagamento" : "Pedido"} <br /> Confirmado.
              </h2>
              <p className="text-xl text-white/40 font-medium mb-4 leading-relaxed max-w-md">
                Seu pedido{" "}
                <span className="text-primary">#{createdOrderId?.slice(0, 10).toUpperCase()}</span>{" "}
                foi {mpEnabled ? "pago e" : ""} registrado.
              </p>
              <p className="text-sm text-white/50 font-medium mb-12 leading-relaxed max-w-md">
                {mpEnabled
                  ? "Acompanhe o status do pedido em Meus Pedidos."
                  : "Entraremos em contato em breve para combinar pagamento e entrega. Acompanhe pelo WhatsApp ou em Meus Pedidos."}
              </p>
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
                <Button
                  variant="outline"
                  className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest border-white/5"
                  onClick={() => navigate("/meus-pedidos")}
                >
                  ACOMPANHAR PEDIDO
                </Button>
                <Button
                  className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest"
                  onClick={() => navigate("/")}
                >
                  VOLTAR PARA HOME
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-28 order-1 lg:order-2">
          <div className="rounded-[32px] sm:rounded-[40px] bg-white/[0.03] border border-white/5 overflow-hidden p-1">
            <div className="bg-surface rounded-[30px] sm:rounded-[38px] p-6 sm:p-10 space-y-6 sm:space-y-10">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mb-4 sm:mb-8">
                <Package className="w-4 h-4" /> Resumo do pedido
              </h3>
              <div className="space-y-3 text-xs text-white/45">
                <div className="flex justify-between">
                  <span>Produtos</span>
                  <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entrega</span>
                  <span>A combinar</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagamento</span>
                  <span>{mpEnabled ? "Mercado Pago" : "Após confirmação"}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-3 sm:space-y-4">
                {confirmedTotals && (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-white/45">
                      <span>Subtotal</span>
                      <span>
                        {confirmedTotals.subtotal.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    {confirmedTotals.discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Desconto no Pix</span>
                        <span>
                          −
                          {confirmedTotals.discount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-4 sm:pt-6">
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/30 mb-2">
                    Total
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg text-white/40 font-mono">R$</span>
                    <p className="text-4xl sm:text-5xl font-display font-black text-shimmer leading-none">
                      {checkoutTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {!mpEnabled && (
                    <p className="mt-4 text-[10px] font-bold leading-relaxed text-white/35">
                      Nenhum pagamento será realizado ao enviar esta solicitação.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 text-center hidden lg:block">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/10 italic">
              Acompanhamento disponível em Meus Pedidos
            </p>
          </div>
        </aside>

        {step === 1 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-xl border-t border-white/10 z-[50]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">
                  Total
                </p>
                <p className="text-2xl font-display font-black text-primary">
                  {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <Button
                onClick={handleCompleteOrder}
                loading={loading || authLoading}
                className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em]"
              >
                {user ? "CONTINUAR" : "ENTRAR"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
