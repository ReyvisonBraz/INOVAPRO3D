import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Package,
  MapPin,
  Lock,
  ChevronRight,
  CreditCard as PaymentIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../services/firebase";
import { toast } from "sonner";
import type { ShippingAddress } from "../../types/domain";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Success
  const [loading, setLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [shippingRate, setShippingRate] = useState<number>(0);
  const [address, setAddress] = useState<ShippingAddress>({
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const validateAddress = () => {
    const requiredFields = [
      address.zipCode,
      address.street,
      address.number,
      address.neighborhood,
      address.city,
      address.state,
    ];

    if (requiredFields.some(field => !field.trim())) {
      toast.error("Endereco incompleto", { description: "Preencha CEP, rua, numero, bairro, cidade e UF antes de continuar." });
      return false;
    }

    if (address.state.trim().length !== 2) {
      toast.error("UF invalida", { description: "Informe a UF com duas letras, por exemplo SP." });
      return false;
    }

    return true;
  };

  const goToPayment = () => {
    if (validateAddress()) {
      setStep(2);
    }
  };

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "shipping"));
        if (snap.exists()) {
          setShippingRate(snap.data().flatRate || 0);
        }
      } catch (err) {
        console.error("Error fetching shipping:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleCompleteOrder = async () => {
    if (!user) {
        toast.error("Autenticação necessária", { description: "Por favor, entre em sua conta para finalizar." });
        return;
    }
    if (!validateAddress()) return;

    setLoading(true);
    const path = "orders";
    
    try {
      const orderRef = await addDoc(collection(db, path), {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        items: items,
        total: total + shippingRate,
        shippingAddress: address,
        status: "PENDING_PAYMENT",
        createdAt: serverTimestamp()
      });
      
      setCreatedOrderId(orderRef.id);
      setStep(3);
      clearCart();
      toast.success("Pedido gerado com sucesso!", { description: "Aguardando confirmação de pagamento Pix." });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      toast.error("Erro ao gerar pedido", { description: "Tente novamente em alguns instantes." });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step !== 3) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8">
           <Package className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-4xl font-display font-black mb-4 uppercase tracking-tight">Seu Terminal está Vazio</h2>
        <p className="text-white/40 mb-12 font-medium">Seu carrinho de manufatura não possui peças pendentes de checkout.</p>
        <Button onClick={() => navigate('/catalogo')} size="lg" className="h-16 px-10 rounded-2xl gap-2 font-black uppercase">
          EXPLORAR CATÁLOGO <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="px-5 lg:px-12 py-8 sm:py-12 max-w-7xl mx-auto min-h-screen">
      {/* Header Stepper */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-10 sm:mb-16 gap-8">
        <div className="text-center md:text-left">
           <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black font-display uppercase tracking-tight mb-2 leading-none">
             Protocolo de <br className="hidden sm:block" /> <span className="text-shimmer italic">Finalização.</span>
           </h1>
           <p className="text-white/40 font-medium text-sm sm:text-base">Configure os parâmetros de entrega e pagamento industrial.</p>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6 bg-white/[0.03] p-4 sm:p-0 sm:bg-transparent rounded-3xl border border-white/5 sm:border-0">
           {[1, 2, 3].map((s) => (
             <React.Fragment key={s}>
               <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center text-sm sm:text-base font-black transition-all ${
                 step === s ? 'bg-primary text-white scale-110 shadow-xl shadow-primary/20' : 
                 step > s ? 'bg-green-500 text-white' : 'bg-white/5 text-white/20'
               }`}>
                 {step > s ? <CheckCircle2 className="w-5 h-5" /> : `0${s}`}
               </div>
               {s < 3 && <div className={`w-6 sm:w-8 h-[2px] rounded-full ${step > s ? 'bg-green-500' : 'bg-white/10'}`} />}
             </React.Fragment>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-32 lg:pb-0">
        {/* Main Content Area */}
        <div className="lg:col-span-8 order-2 lg:order-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step-shipping"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-12"
              >
                 <section className="space-y-6 sm:space-y-8">
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                       <MapPin className="w-4 h-4" /> Logística de Distribuição
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                       <div className="space-y-3">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">CEP</label>
                          <input 
                            placeholder="00000-000" 
                            inputMode="numeric"
                            autoComplete="postal-code"
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-lg font-mono focus:border-primary focus:bg-primary/5 transition-all outline-none" 
                            value={address.zipCode}
                            onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Endereço Completo</label>
                          <input 
                            placeholder="Rua, Av, etc." 
                            autoComplete="street-address"
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-lg font-medium focus:border-primary focus:bg-primary/5 transition-all outline-none" 
                            value={address.street}
                            onChange={(e) => setAddress({...address, street: e.target.value})}
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Número / Bairro</label>
                          <input 
                            placeholder="Ex: 123" 
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-lg font-medium focus:border-primary focus:bg-primary/5 transition-all outline-none" 
                            value={address.number}
                            onChange={(e) => setAddress({...address, number: e.target.value})}
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Cidade</label>
                          <input 
                            placeholder="São Paulo - SP" 
                            autoComplete="address-level2"
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-lg font-medium focus:border-primary focus:bg-primary/5 transition-all outline-none" 
                            value={address.city}
                            onChange={(e) => setAddress({...address, city: e.target.value})}
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">Bairro</label>
                          <input 
                            placeholder="Ex: Centro" 
                            autoComplete="address-level3"
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-lg font-medium focus:border-primary focus:bg-primary/5 transition-all outline-none" 
                            value={address.neighborhood}
                            onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                          />
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-2">UF</label>
                          <input 
                            placeholder="SP" 
                            maxLength={2}
                            autoComplete="address-level1"
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-5 text-lg font-mono uppercase focus:border-primary focus:bg-primary/5 transition-all outline-none" 
                            value={address.state}
                            onChange={(e) => setAddress({...address, state: e.target.value.toUpperCase()})}
                          />
                       </div>
                    </div>
                 </section>

                 <Button size="lg" className="h-16 sm:h-20 w-full rounded-2xl sm:rounded-3xl gap-4 text-lg sm:text-xl font-display font-black uppercase tracking-tight" onClick={goToPayment}>
                   CONFIGURAR PAGAMENTO <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                 </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step-payment"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-12"
              >
                <section className="space-y-8">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                      <CreditCard className="w-4 h-4" /> Transação de Hardware
                   </h3>
                   
                   <div className="space-y-4">
                      <button className="w-full p-8 rounded-[32px] border-2 border-primary bg-primary/5 flex items-center justify-between group relative overflow-hidden transition-all">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-6 relative z-10">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-3 shadow-lg">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" className="w-full" alt="Pix" />
                          </div>
                          <div className="text-left">
                            <p className="text-xl font-black uppercase font-display leading-tight">Pix Instantâneo</p>
                            <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">Cashback de 5% aplicado</p>
                          </div>
                        </div>
                        <CheckCircle2 className="text-primary w-8 h-8 relative z-10" />
                      </button>

                      <button className="w-full p-8 rounded-[32px] border border-white/5 bg-white/5 flex items-center justify-between opacity-40 cursor-not-allowed group grayscale">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <PaymentIcon className="w-8 h-8 text-white/20" />
                          </div>
                          <div className="text-left">
                            <p className="text-xl font-black uppercase font-display leading-tight">Cartão de Crédito</p>
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Em planejamento</p>
                          </div>
                        </div>
                        <Lock className="w-6 h-6 text-white/10" />
                      </button>
                   </div>
                </section>

                <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex gap-4">
                   <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                   <p className="text-[11px] text-white/40 leading-relaxed italic font-medium">
                     O pagamento real ainda depende de confirmação operacional. Seu projeto entra na fila após validação do pedido pela equipe.
                   </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                   <Button variant="outline" className="h-20 rounded-3xl flex-1 text-sm font-black uppercase tracking-widest border-white/10" onClick={() => setStep(1)}>
                     Logística
                   </Button>
                   <Button 
                      loading={loading}
                      isShimmer
                      size="lg" 
                      className="h-20 rounded-3xl flex-[2] gap-4 text-xl font-display font-black uppercase tracking-tight" 
                      onClick={handleCompleteOrder}
                   >
                     EMITIR ORDEM DE PRODUÇÃO <ArrowRight className="w-6 h-6" />
                   </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step-success"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="text-center py-16 flex flex-col items-center"
              >
                <div className="relative mb-12">
                   <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                   <div className="w-32 h-32 rounded-[40px] bg-primary text-white flex items-center justify-center relative border-4 border-white/10 shadow-2xl">
                     <CheckCircle2 className="w-16 h-16" />
                   </div>
                </div>
                
                <h2 className="text-5xl lg:text-7xl font-display font-black mb-6 uppercase tracking-tighter leading-none">
                  Ordem <br /> Iniciada.
                </h2>
                <p className="text-xl text-white/40 font-medium mb-12 leading-relaxed max-w-md">
                   Sua ordem de manufatura <span className="text-primary">#{createdOrderId?.slice(0, 10).toUpperCase()}</span> foi registrada e aguarda confirmacao de pagamento.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
                   <Button variant="outline" className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest border-white/5" onClick={() => navigate('/meus-pedidos')}>
                      PAINEL DE PRODUÇÃO
                   </Button>
                   <Button className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest" onClick={() => navigate('/')}>
                      FINALIZAR E SAIR
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Project Summary Sidebar */}
        <aside className="lg:col-span-4 sticky top-28 order-1 lg:order-2">
           <div className="rounded-[32px] sm:rounded-[40px] bg-white/[0.03] border border-white/5 overflow-hidden p-1">
              <div className="bg-surface rounded-[30px] sm:rounded-[38px] p-6 sm:p-10 space-y-6 sm:space-y-10">
                 <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 mb-4 sm:mb-8">
                    <Package className="w-4 h-4" /> Sumário de Insumos
                 </h3>

                 <div className="space-y-4 sm:space-y-6 max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                   {items.map(item => (
                     <div key={item.id} className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                           <p className="text-xs sm:text-sm font-bold uppercase truncate tracking-tight">{item.name}</p>
                           <p className="text-[8px] sm:text-[10px] text-white/30 font-mono">QTD: {item.quantity}</p>
                        </div>
                        <p className="text-xs sm:text-sm font-mono font-black text-white/60 shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</p>
                     </div>
                   ))}
                 </div>

                 <div className="pt-6 sm:pt-10 border-t border-white/5 space-y-3 sm:space-y-4">
                    <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/20">
                       <span>Expedição / Logística</span>
                       <span className={shippingRate === 0 ? "text-green-500" : ""}>
                          {shippingRate === 0 ? "Free Tier" : `R$ ${shippingRate.toFixed(2)}`}
                       </span>
                    </div>
                    <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/20">
                       <span>Taxas Fiscais</span>
                       <span>Incluídas</span>
                    </div>
                    
                    <div className="pt-4 sm:pt-6">
                       <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Total Consolidado</p>
                       <div className="flex items-baseline gap-2">
                          <span className="text-base sm:text-lg text-white/40 font-mono">R$</span>
                          <p className="text-4xl sm:text-5xl font-display font-black text-shimmer leading-none">
                             {(total + shippingRate).toFixed(2)}
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="mt-6 sm:mt-8 text-center hidden lg:block">
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/10 italic">Secure Print Protocol Secured by AES-256</p>
           </div>
        </aside>

        {/* Floating Mobile Sticky Total - visible only on mobile/tablet during checkout steps */}
        {step < 3 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface/80 backdrop-blur-xl border-t border-white/10 z-[50]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Total</p>
                <p className="text-2xl font-display font-black text-primary">R$ {(total + shippingRate).toFixed(2)}</p>
              </div>
              <Button 
                onClick={() => step === 1 ? goToPayment() : handleCompleteOrder()}
                loading={loading}
                className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em]"
              >
                {step === 1 ? "PRÓXIMO" : "FINALIZAR"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
