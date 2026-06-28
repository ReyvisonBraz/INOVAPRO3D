import { Fragment, useEffect, useRef, useState } from "react";
import { PageSEO } from "../../components/seo/PageSEO";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Package,
  MapPin,
  Lock,
  ChevronRight,
  Truck,
  Tag,
  X,
  CreditCard as PaymentIcon,
} from "lucide-react";
import { useCoupon } from "../../hooks/useCoupon";
import { motion, AnimatePresence } from "framer-motion";
import { Elements } from "@stripe/react-stripe-js";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../../services/firebase";
import { toast } from "sonner";
import { stripePromise, stripeEnabled, stripeAppearance } from "../../lib/stripe";
import { StripePaymentForm } from "../../components/checkout/StripePaymentForm";
import type { ShippingAddress } from "../../types/domain";
import { trackBeginCheckout, trackPurchase } from "../../lib/analytics";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [shippingRate, setShippingRate] = useState<number>(0);
  const [needsShipping, setNeedsShipping] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    zipCode: '', street: '', number: '', neighborhood: '', city: '', state: ''
  });

  const coupon = useCoupon(total + shippingRate);
  const finalTotal = total + shippingRate - coupon.discount;

  // Eventos de conversão (analytics/pixels), uma vez cada.
  const trackedCheckout = useRef(false);
  const trackedPurchase = useRef(false);
  const lastTotalRef = useRef(0);
  useEffect(() => {
    if (finalTotal > 0) lastTotalRef.current = finalTotal; // guarda antes do carrinho ser limpo
  }, [finalTotal]);
  useEffect(() => {
    if (step >= 2 && !trackedCheckout.current) {
      trackedCheckout.current = true;
      trackBeginCheckout(lastTotalRef.current);
    }
  }, [step]);
  useEffect(() => {
    if (step === 3 && createdOrderId && !trackedPurchase.current) {
      trackedPurchase.current = true;
      trackPurchase(lastTotalRef.current, createdOrderId);
    }
  }, [step, createdOrderId]);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);

  // Handle PIX return redirect from Stripe
  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    const orderId = searchParams.get('order_id');
    if (redirectStatus === 'succeeded' && orderId) {
      // Mark order as PAID after PIX redirect
      updateDoc(doc(db, 'orders', orderId), { status: 'PAID' }).catch(() => {});
      setCreatedOrderId(orderId);
      setStep(3);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "shipping"));
        if (snap.exists()) setShippingRate(snap.data().flatRate || 0);
      } catch { /* silent */ }
    };
    fetchSettings();
  }, []);

  const fetchCep = async (cep: string) => {
    try {
      setCepLoading(true);
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) { toast.error("Serviço de CEP indisponível."); return; }
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado."); return; }
      setAddress(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      toast.success("Endereço preenchido!");
    } catch { /* silent */ } finally { setCepLoading(false); }
  };

  const validateAddress = () => {
    if (!needsShipping) return true;
    const required = [address.zipCode, address.street, address.number, address.neighborhood, address.city, address.state];
    if (required.some(f => !f.trim())) {
      toast.error("Endereço incompleto", { description: "Preencha todos os campos de entrega." });
      return false;
    }
    if (address.zipCode.replace(/\D/g, "").length !== 8) {
      toast.error("CEP inválido");
      return false;
    }
    if (address.state.trim().length !== 2) {
      toast.error("UF inválida", { description: "Use 2 letras, ex: PA" });
      return false;
    }
    return true;
  };

  const goToPayment = () => { if (validateAddress()) setStep(2); };

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

  // ── Stripe flow ────────────────────────────────────────────────────────────
  const handleInitiateStripePayment = async () => {
    if (!validateAddress()) return;
    const checkoutUser = await ensureCheckoutUser();
    if (!checkoutUser) return;

    setCreatingIntent(true);
    const path = "orders";
    try {
      const orderRef = await addDoc(collection(db, path), {
        userId: checkoutUser.uid,
        userName: checkoutUser.displayName || checkoutUser.email,
        userEmail: checkoutUser.email,
        items,
        total: finalTotal,
        subtotal: total,
        shippingRate,
        couponCode: coupon.coupon?.code ?? null,
        couponDiscount: coupon.discount > 0 ? coupon.discount : null,
        shippingAddress: needsShipping ? address : null,
        status: "PENDING_PAYMENT",
        paymentMethod: "stripe",
        createdAt: serverTimestamp(),
      });

      const idToken = await checkoutUser.getIdToken();
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        // amount NOT sent — server reads it from Firestore to prevent tampering
        body: JSON.stringify({ orderId: orderRef.id, customerEmail: checkoutUser.email }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { clientSecret: secret } = await res.json() as { clientSecret: string };

      // Notify admin via Telegram (fire-and-forget) — token required
      fetch('/api/notify/new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          orderId: orderRef.id,
          customerName: checkoutUser.displayName || checkoutUser.email,
          customerEmail: checkoutUser.email,
          total: finalTotal,
          itemCount: items.length,
          paymentMethod: 'stripe',
        }),
      }).catch(() => {});

      if (coupon.coupon) {
        updateDoc(doc(db, "coupons", coupon.coupon.id), { usedCount: increment(1) }).catch(() => {});
      }
      setStripeOrderId(orderRef.id);
      setClientSecret(secret);
      clearCart();
    } catch {
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setCreatingIntent(false);
    }
  };

  const handleStripeSuccess = () => {
    setCreatedOrderId(stripeOrderId);
    setStep(3);
  };

  // ── Manual PIX flow (fallback when Stripe not configured) ──────────────────
  const handleCompleteOrder = async () => {
    if (!validateAddress()) return;
    const checkoutUser = await ensureCheckoutUser();
    if (!checkoutUser) return;

    setLoading(true);
    const path = "orders";
    try {
      const orderRef = await addDoc(collection(db, path), {
        userId: checkoutUser.uid,
        userName: checkoutUser.displayName || checkoutUser.email,
        userEmail: checkoutUser.email,
        items,
        total: finalTotal,
        subtotal: total,
        shippingRate,
        couponCode: coupon.coupon?.code ?? null,
        couponDiscount: coupon.discount > 0 ? coupon.discount : null,
        shippingAddress: needsShipping ? address : null,
        status: "PENDING_PAYMENT",
        paymentMethod: "pix_manual",
        createdAt: serverTimestamp(),
      });
      // Notify admin via Telegram (fire-and-forget)
      const idToken = await checkoutUser.getIdToken();
      fetch('/api/notify/new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          orderId: orderRef.id,
          customerName: checkoutUser.displayName || checkoutUser.email,
          customerEmail: checkoutUser.email,
          total: finalTotal,
          itemCount: items.length,
          paymentMethod: 'pix_manual',
        }),
      }).catch(() => {});

      if (coupon.coupon) {
        updateDoc(doc(db, "coupons", coupon.coupon.id), { usedCount: increment(1) }).catch(() => {});
      }
      setCreatedOrderId(orderRef.id);
      setStep(3);
      clearCart();
      toast.success("Pedido gerado!", { description: "Acompanhe em Meus Pedidos." });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      toast.error("Erro ao gerar pedido. Tente novamente.");
    } finally { setLoading(false); }
  };

  // ── Empty cart guard ───────────────────────────────────────────────────────
  if (items.length === 0 && step !== 3) {
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
        title="Finalizar Compra"
        description="Conclua seu pedido de impressão 3D: endereço de entrega, confirmação dos itens e pagamento seguro via PIX ou cartão."
        path="/checkout"
        noindex
      />
      {/* Stepper */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-10 sm:mb-16 gap-8">
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black font-display uppercase tracking-tight mb-2 leading-none">
            Finalizar <br className="hidden sm:block" />
            <span className="text-shimmer italic">Pedido.</span>
          </h1>
          <p className="text-white/40 font-medium text-sm sm:text-base">
            Revise a entrega, confirme o pagamento e acompanhe em Meus Pedidos.
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 bg-white/[0.03] p-4 sm:p-0 sm:bg-transparent rounded-3xl border border-white/5 sm:border-0">
          {([{n:1,label:'Entrega'},{n:2,label:'Pagamento'},{n:3,label:'Confirmação'}]).map(({n:s,label}) => (
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
              {s < 3 && <div className={`w-6 sm:w-8 h-[2px] rounded-full mb-4 ${step > s ? 'bg-green-500' : 'bg-white/10'}`} />}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-32 lg:pb-0">
        {/* Main Content */}
        <div className="lg:col-span-8 order-2 lg:order-1">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: SHIPPING ──────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-12">
                <section className="space-y-6 sm:space-y-8">
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                    <MapPin className="w-4 h-4" /> Forma de entrega
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setNeedsShipping(false)}
                      className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl border-2 transition-all ${!needsShipping ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/15'}`}>
                      <MapPin className={`w-5 h-5 ${!needsShipping ? 'text-primary' : 'text-white/20'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Retirada</span>
                      <span className="text-[9px] font-medium opacity-70">Busco no local / Sem frete</span>
                    </button>
                    <button type="button" onClick={() => setNeedsShipping(true)}
                      className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-2xl border-2 transition-all ${needsShipping ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/15'}`}>
                      <Truck className={`w-5 h-5 ${needsShipping ? 'text-primary' : 'text-white/20'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Entrega</span>
                      <span className="text-[9px] font-medium opacity-70">Recebo no endereço</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {needsShipping && (
                      <motion.div key="addr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                          {[
                            { label: `CEP ${cepLoading ? '— buscando...' : ''}`, key: 'zipCode', placeholder: '00000-000', inputMode: 'numeric' as const, autoComplete: 'postal-code', mono: true,
                              onChange: (v: string) => { const r = v.replace(/\D/g, "").slice(0, 8); const m = r.length > 5 ? `${r.slice(0,5)}-${r.slice(5)}` : r; setAddress(p => ({...p, zipCode: m})); if (r.length === 8) fetchCep(r); } },
                            { label: 'Endereço', key: 'street', placeholder: 'Rua, Av...', autoComplete: 'street-address', onChange: (v: string) => setAddress(p => ({...p, street: v})) },
                            { label: 'Número', key: 'number', placeholder: '123', onChange: (v: string) => setAddress(p => ({...p, number: v})) },
                            { label: 'Bairro', key: 'neighborhood', placeholder: 'Centro', autoComplete: 'address-level3', onChange: (v: string) => setAddress(p => ({...p, neighborhood: v})) },
                            { label: 'Cidade', key: 'city', placeholder: 'Belém', autoComplete: 'address-level2', onChange: (v: string) => setAddress(p => ({...p, city: v})) },
                            { label: 'UF', key: 'state', placeholder: 'PA', maxLength: 2, mono: true, onChange: (v: string) => setAddress(p => ({...p, state: v.toUpperCase()})) },
                          ].map(field => (
                            <div key={field.key} className="space-y-3">
                              <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">{field.label}</label>
                              <input
                                placeholder={field.placeholder}
                                inputMode={field.inputMode}
                                autoComplete={field.autoComplete}
                                maxLength={field.maxLength}
                                className={`w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-base sm:text-lg focus:border-primary focus:bg-primary/5 transition-all outline-none ${field.mono ? 'font-mono' : 'font-medium'}`}
                                value={(address as any)[field.key]}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                <Button size="lg" className="h-16 sm:h-20 w-full rounded-2xl sm:rounded-3xl gap-4 text-lg sm:text-xl font-display font-black uppercase tracking-tight" onClick={goToPayment}>
                  CONTINUAR PARA PAGAMENTO <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              </motion.div>
            )}

            {/* ── STEP 2: PAYMENT ───────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                  <CreditCard className="w-4 h-4" /> Forma de pagamento
                </h3>

                {stripeEnabled ? (
                  /* ─── STRIPE CONFIGURED ─────────────────────── */
                  clientSecret ? (
                    /* Stripe form already loaded — show PaymentElement */
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance, locale: 'pt-BR' }}>
                      <StripePaymentForm
                        orderId={stripeOrderId!}
                        amount={finalTotal}
                        onSuccess={handleStripeSuccess}
                        onError={msg => toast.error(msg)}
                        onBack={() => { setClientSecret(null); setStep(1); }}
                      />
                    </Elements>
                  ) : (
                    /* Stripe configured but intent not created yet */
                    <div className="space-y-8">
                      {/* Payment method preview */}
                      <div className="space-y-3">
                        <div className="p-4 sm:p-8 rounded-[24px] border-2 border-primary bg-primary/5 flex items-center gap-4 sm:gap-6">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shrink-0 shadow-lg">
                            <CreditCard className="w-6 h-6 text-slate-900" />
                          </div>
                          <div>
                            <p className="text-base sm:text-xl font-black uppercase font-display">Cartão ou PIX</p>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Pagamento seguro via Stripe</p>
                          </div>
                          <CheckCircle2 className="text-primary w-6 h-6 sm:w-8 sm:h-8 ml-auto shrink-0" />
                        </div>
                      </div>

                      {!user && (
                        <div className="p-5 rounded-[24px] bg-primary/5 border border-primary/15 flex gap-4">
                          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                            Entre com Google na finalização. Seu pedido aparece automaticamente em <span className="text-white">Meus Pedidos</span>.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="outline" className="h-20 rounded-3xl flex-1 text-sm font-black uppercase tracking-widest border-white/10" onClick={() => setStep(1)}>
                          Logística
                        </Button>
                        <Button isShimmer size="lg" loading={creatingIntent || authLoading}
                          className="h-20 rounded-3xl flex-[2] gap-4 text-xl font-display font-black uppercase tracking-tight"
                          onClick={handleInitiateStripePayment}>
                          {user ? "PROSSEGUIR PARA O PAGAMENTO" : "ENTRAR E PROSSEGUIR"}
                          <ArrowRight className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  /* ─── STRIPE NOT CONFIGURED — manual PIX ────── */
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <button className="w-full p-4 sm:p-8 rounded-[24px] sm:rounded-[32px] border-2 border-primary bg-primary/5 flex items-center justify-between relative overflow-hidden transition-all">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3 sm:gap-6 relative z-10 min-w-0">
                          <div className="w-11 h-11 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center p-2 sm:p-3 shadow-lg shrink-0">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" loading="lazy" decoding="async" className="w-full" alt="Pix" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-base sm:text-xl font-black uppercase font-display leading-tight">Pix Instantâneo</p>
                            <p className="text-[10px] sm:text-xs text-primary font-bold uppercase tracking-widest mt-1">Confirmação manual pela equipe</p>
                          </div>
                        </div>
                        <CheckCircle2 className="text-primary w-6 h-6 sm:w-8 sm:h-8 relative z-10 shrink-0 ml-2" />
                      </button>

                      <button disabled className="w-full p-4 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-white/5 bg-white/5 flex items-center justify-between opacity-40 cursor-not-allowed grayscale">
                        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                          <div className="w-11 h-11 sm:w-16 sm:h-16 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                            <PaymentIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white/20" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-base sm:text-xl font-black uppercase font-display leading-tight">Cartão de Crédito</p>
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Em breve</p>
                          </div>
                        </div>
                        <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white/10 shrink-0 ml-2" />
                      </button>
                    </div>

                    <div className="p-5 sm:p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex gap-4">
                      <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                      <p className="text-[11px] text-white/40 leading-relaxed italic font-medium">
                        O código Pix será gerado após a confirmação do pedido. Nossa equipe confirma o pagamento antes de iniciar a produção.
                      </p>
                    </div>

                    {!user && (
                      <div className="p-5 rounded-[24px] bg-primary/5 border border-primary/15 flex gap-4">
                        <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] text-white/55 leading-relaxed font-medium">
                          Entre com Google para salvar e acompanhar o pedido em <span className="text-white">Meus Pedidos</span>.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button variant="outline" className="h-20 rounded-3xl flex-1 text-sm font-black uppercase tracking-widest border-white/10" onClick={() => setStep(1)}>
                        Logística
                      </Button>
                      <Button isShimmer size="lg" loading={loading || authLoading}
                        className="h-20 rounded-3xl flex-[2] gap-4 text-xl font-display font-black uppercase tracking-tight"
                        onClick={handleCompleteOrder}>
                        {user ? "FINALIZAR PEDIDO" : "ENTRAR E FINALIZAR"} <ArrowRight className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 3: SUCCESS ───────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 flex flex-col items-center">
                <div className="relative mb-12">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                  <div className="w-32 h-32 rounded-[40px] bg-primary text-white flex items-center justify-center relative border-4 border-white/10 shadow-2xl">
                    <CheckCircle2 className="w-16 h-16" />
                  </div>
                </div>
                <h2 className="text-5xl lg:text-7xl font-display font-black mb-6 uppercase tracking-tighter leading-none">
                  Pedido <br /> Recebido.
                </h2>
                <p className="text-xl text-white/40 font-medium mb-12 leading-relaxed max-w-md">
                  Seu pedido <span className="text-primary">#{createdOrderId?.slice(0, 10).toUpperCase()}</span> foi registrado e já pode ser acompanhado.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
                  <Button variant="outline" className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest border-white/5" onClick={() => navigate('/meus-pedidos')}>
                    ACOMPANHAR PEDIDO
                  </Button>
                  <Button className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest" onClick={() => navigate('/')}>
                    VOLTAR PARA HOME
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
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
              {/* Coupon input */}
              {step < 3 && (
                <div className="pt-4 border-t border-white/5">
                  {coupon.coupon ? (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-wider truncate">{coupon.coupon.code}</span>
                      </div>
                      <button onClick={coupon.clear} className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                        <X className="w-3 h-3 text-white/40" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          placeholder="Código do cupom"
                          value={coupon.code}
                          onChange={e => coupon.setCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === "Enter" && coupon.apply()}
                          className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono focus:border-primary focus:bg-primary/5 outline-none transition-all placeholder:text-white/20 uppercase"
                        />
                        <button
                          onClick={coupon.apply}
                          disabled={coupon.loading || !coupon.code.trim()}
                          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary text-white/40 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30"
                        >
                          {coupon.loading ? "..." : "Aplicar"}
                        </button>
                      </div>
                      {coupon.error && (
                        <p className="text-[10px] text-red-400 font-medium px-1">{coupon.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-6 sm:pt-10 border-t border-white/5 space-y-3 sm:space-y-4">
                <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-white/40">
                  <span>Entrega</span>
                  <span className={shippingRate === 0 ? "text-green-400 font-black" : ""}>
                    {shippingRate === 0 ? "Grátis" : shippingRate.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                {coupon.discount > 0 && (
                  <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-green-400">
                    <span>Cupom ({coupon.coupon?.code})</span>
                    <span>− {coupon.discount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-white/40">
                  <span>Taxas</span><span>Inclusas</span>
                </div>
                <div className="pt-4 sm:pt-6">
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/30 mb-2">Total</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base sm:text-lg text-white/40 font-mono">R$</span>
                    <p className="text-4xl sm:text-5xl font-display font-black text-shimmer leading-none">
                      {finalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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

        {/* Mobile sticky bar */}
        {step < 3 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-xl border-t border-white/10 z-[50]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Total</p>
                <p className="text-2xl font-display font-black text-primary">
                  {finalTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <Button
                onClick={() => {
                  if (step === 1) return goToPayment();
                  if (stripeEnabled && !clientSecret) return handleInitiateStripePayment();
                  if (!stripeEnabled) return handleCompleteOrder();
                }}
                loading={loading || authLoading || creatingIntent}
                className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em]"
              >
                {step === 1 ? "PRÓXIMO" : stripeEnabled ? (user ? "PAGAR" : "ENTRAR") : (user ? "FINALIZAR" : "ENTRAR")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
