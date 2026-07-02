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
} from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../../services/firebase";
import { toast } from "sonner";
import { trackBeginCheckout, trackPurchase } from "../../lib/analytics";

// PAYMENT_DISABLED: Pagamento (Stripe/PIX) e envio suspension temporária.
// Quando reativar, restaure o Checkout original do git history.
const PAYMENT_DISABLED = true;

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Eventos de conversão (analytics/pixels), uma vez cada.
  const trackedCheckout = useRef(false);
  const trackedPurchase = useRef(false);
  const lastTotalRef = useRef(0);
  useEffect(() => { if (total > 0) lastTotalRef.current = total; }, [total]);
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
      if (!u) { toast.error("Login não concluído."); return null; }
      toast.success("Login concluído!");
      return u;
    } catch {
      toast.error("Login cancelado.");
      return null;
    } finally { setAuthLoading(false); }
  };

  const handleCompleteOrder = async () => {
    const checkoutUser = await ensureCheckoutUser();
    if (!checkoutUser) return;

    setLoading(true);
    try {
      const orderRef = await addDoc(collection(db, "orders"), {
        userId: checkoutUser.uid,
        userName: checkoutUser.displayName || checkoutUser.email,
        userEmail: checkoutUser.email,
        items,
        total,
        subtotal: total,
        shippingRate: 0,
        couponCode: null,
        couponDiscount: null,
        shippingAddress: null,
        status: "PENDING_PAYMENT",
        paymentMethod: "manual",
        createdAt: serverTimestamp(),
      } as Record<string, unknown>);

      const idToken = await checkoutUser.getIdToken();
      fetch('/api/notify/new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          orderId: orderRef.id,
          customerName: checkoutUser.displayName || checkoutUser.email,
          customerEmail: checkoutUser.email,
          total,
          itemCount: items.length,
          paymentMethod: 'manual',
        }),
      }).catch(() => {});

      if (!trackedPurchase.current) {
        trackedPurchase.current = true;
        trackPurchase(lastTotalRef.current, orderRef.id);
      }

      setCreatedOrderId(orderRef.id);
      setStep(2);
      clearCart();
      toast.success("Pedido recebido!", { description: "Entraremos em contato para combinar pagamento e entrega." });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "orders");
      toast.error("Erro ao gerar pedido. Tente novamente.");
    } finally { setLoading(false); }
  };

  if (items.length === 0 && step !== 2) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8">
          <Package className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-black mb-4 uppercase tracking-tight">Seu carrinho está vazio</h2>
        <p className="text-white/40 mb-12 font-medium">Adicione um produto ao carrinho para finalizar seu pedido.</p>
        <Button onClick={() => navigate('/catalogo')} size="lg" className="h-16 px-10 rounded-2xl gap-2 font-black uppercase">
          EXPLORAR CATÁLOGO <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-12 py-8 sm:py-12 max-w-7xl mx-auto min-h-screen">
      <PageSEO
        title="Finalizar Pedido"
        description="Confirme seu pedido de impressão 3D. Entraremos em contato para combinar pagamento e entrega."
        path="/checkout"
        noindex
      />
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-10 sm:mb-16 gap-8">
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black font-display uppercase tracking-tight mb-2 leading-none">
            Finalizar <br className="hidden sm:block" />
            <span className="text-shimmer italic">Pedido.</span>
          </h1>
          <p className="text-white/40 font-medium text-sm sm:text-base">
            {PAYMENT_DISABLED
              ? "Confirme seu pedido — combinamos pagamento e entrega pelo WhatsApp."
              : "Revise os itens e confirme seu pedido."}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.03] p-4 sm:p-0 sm:bg-transparent rounded-3xl border border-white/5 sm:border-0">
          {([{n:1 as const,label:'Revisão'},{n:2 as const,label:'Confirmação'}]).map(({n:s,label}) => (
            <Fragment key={s}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-sm sm:text-base font-black transition-all ${
                  step === s ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/20' :
                  step > s ? 'bg-green-500 text-white' : 'bg-white/5 text-white/20'
                }`}>
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : `0${s}`}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${step === s ? 'text-primary' : step > s ? 'text-green-500' : 'text-white/20'}`}>{label}</span>
              </div>
              {s < 2 && <div className={`w-6 sm:w-8 h-[2px] rounded-full mb-4 ${step > s ? 'bg-green-500' : 'bg-white/10'}`} />}
            </Fragment>
          ))}
        </div>
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
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      {item.image && (
                        <img src={item.image} loading="lazy" alt={item.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate tracking-tight">{item.name}</p>
                        <p className="text-[11px] text-white/30 font-mono mt-0.5">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-mono font-black text-white/70 shrink-0">
                        {(item.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {PAYMENT_DISABLED && (
                <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/15 flex gap-4">
                  <MessageCircle className="w-6 h-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-black text-white uppercase tracking-widest">Pagamento e Entrega sob Demanda</p>
                    <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                      O pagamento (PIX/cartão) e a entrega serão combinados diretamente com nossa equipe após o pedido.
                      Você receberá um contato pelo WhatsApp ou e-mail informado no cadastro.
                    </p>
                  </div>
                </div>
              )}

              {!user && (
                <div className="p-5 rounded-[24px] bg-primary/5 border border-primary/15 flex gap-4">
                  <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                    Entre com Google para salvar e acompanhar o pedido em <span className="text-white">Meus Pedidos</span>.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex-1 text-sm font-black uppercase tracking-widest border-white/10" onClick={() => navigate('/catalogo')}>
                  Continuar Comprando
                </Button>
                <Button isShimmer size="lg" loading={loading || authLoading}
                  className="h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex-[2] gap-4 text-lg sm:text-xl font-display font-black uppercase tracking-tight"
                  onClick={handleCompleteOrder}>
                  {user ? "CONFIRMAR PEDIDO" : "ENTRAR E CONFIRMAR"} <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <div className="w-32 h-32 rounded-[40px] bg-primary text-white flex items-center justify-center relative border-4 border-white/10 shadow-2xl">
                  <CheckCircle2 className="w-16 h-16" />
                </div>
              </div>
              <h2 className="text-5xl lg:text-7xl font-display font-black mb-6 uppercase tracking-tighter leading-none">
                Pedido <br /> Recebido.
              </h2>
              <p className="text-xl text-white/40 font-medium mb-4 leading-relaxed max-w-md">
                Seu pedido <span className="text-primary">#{createdOrderId?.slice(0, 10).toUpperCase()}</span> foi registrado.
              </p>
              <p className="text-sm text-white/50 font-medium mb-12 leading-relaxed max-w-md">
                Entraremos em contato em breve para combinar <span className="text-white">pagamento e entrega</span>.
                Acompanhe pelo WhatsApp ou em Meus Pedidos.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
                <Button variant="outline" className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest border-white/5" onClick={() => navigate('/meus-pedidos')}>
                  ACOMPANHAR PEDIDO
                </Button>
                <Button className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest" onClick={() => navigate('/')}>
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
              <div className="space-y-4 sm:space-y-6 max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate tracking-tight">{item.name}</p>
                      <p className="text-[10px] sm:text-xs text-white/30 font-mono mt-0.5">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-xs sm:text-sm font-mono font-black text-white/70 shrink-0">
                      {(item.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-6 sm:pt-10 border-t border-white/5 space-y-3 sm:space-y-4">
                <div className="pt-4 sm:pt-6">
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/30 mb-2">Total</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg text-white/40 font-mono">R$</span>
                    <p className="text-4xl sm:text-5xl font-display font-black text-shimmer leading-none">
                      {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 text-center hidden lg:block">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/10 italic">Acompanhamento disponível em Meus Pedidos</p>
          </div>
        </aside>

        {step === 1 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-xl border-t border-white/10 z-[50]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Total</p>
                <p className="text-2xl font-display font-black text-primary">
                  {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <Button onClick={handleCompleteOrder} loading={loading || authLoading}
                className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em]">
                {user ? "CONFIRMAR" : "ENTRAR"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}