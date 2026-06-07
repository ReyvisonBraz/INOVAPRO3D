import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Printer,
  History,
  TrendingUp,
  Settings,
  Truck,
  Layers,
  ListTodo,
  Wallet,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Order, OrderItem, OrderStatus } from "../../types/domain";

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      const path = "orders";
      try {
        const q = query(
          collection(db, path), 
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "PENDING_PAYMENT": return <Wallet className="w-4 h-4" />;
      case "PAID": return <CheckCircle2 className="w-4 h-4" />;
      case "QUEUE": return <ListTodo className="w-4 h-4" />;
      case "PRINTING": return <Zap className="w-4 h-4 animate-pulse" />;
      case "FINISHING": return <Layers className="w-4 h-4" />;
      case "SHIPPED": return <Truck className="w-4 h-4 animate-pulse" />;
      case "COMPLETED": return <CheckCircle2 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "PENDING_PAYMENT": return "Aguardando Pagamento";
      case "PAID": return "Pagamento Aprovado";
      case "QUEUE": return "Fila de Impressão";
      case "PRINTING": return "Imprimindo (Manufatura)";
      case "FINISHING": return "Acabamento (Q.A.)";
      case "SHIPPED": return "Enviado / Em Trânsito";
      case "COMPLETED": return "Finalizado & Entregue";
      default: return "Em Análise";
    }
  };

  const getStatusStep = (status: OrderStatus): number => {
    switch (status) {
      case "PENDING_PAYMENT": return 0;
      case "PAID": return 1;
      case "QUEUE": return 2;
      case "PRINTING": return 3;
      case "FINISHING": return 3;
      case "SHIPPED": return 4;
      case "COMPLETED": return 5;
      default: return 0;
    }
  };

  if (loading) return (
    <div className="p-20 text-center animate-pulse flex flex-col items-center gap-6">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Sincronizando com a Fábrica...</span>
    </div>
  );

  return (
    <div className="px-6 lg:px-12 py-12 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4 sm:gap-8">
        <div>
           <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-2xl">
                 <History className="w-6 h-6 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Controle de Produção</span>
           </div>
           <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black font-display uppercase tracking-tight mb-2 leading-none">
             Meus <span className="text-shimmer italic">Projetos.</span>
           </h1>
           <p className="text-white/40 font-medium text-lg">Acompanhe o workflow de materialização das suas peças em tempo real.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 text-center min-w-[140px]">
              <p className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-1">Ativos</p>
              <p className="text-3xl font-display font-black text-primary">{orders.filter(o => o.status !== 'COMPLETED').length}</p>
           </div>
           <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 text-center min-w-[140px]">
              <p className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-1">Entregues</p>
              <p className="text-3xl font-display font-black text-white">{orders.filter(o => o.status === 'COMPLETED').length}</p>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-20 py-32 rounded-[64px] bg-white/[0.02] border border-dashed border-white/10 text-center"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-10 border border-white/5">
               <Printer className="w-8 h-8 sm:w-10 sm:h-10 text-white/10" />
            </div>
            <h3 className="text-3xl font-black font-display uppercase tracking-tight mb-4">Nenhum Projeto Ativo</h3>
            <p className="text-white/30 max-w-sm mx-auto mb-12">Inicie sua jornada de manufatura digital explorando nosso catálogo de protótipos prontos.</p>
            <Link to="/catalogo">
              <Button size="lg" className="h-16 px-10 rounded-2xl font-black uppercase gap-2">
                COMEÇAR PROJETOS <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {orders.map((order, idx) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="p-10 rounded-[48px] bg-white/[0.03] border border-white/5 hover:border-primary/2 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between gap-6 lg:gap-12 relative z-10">
                  <div className="flex-1 space-y-10">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-mono text-white/40 tracking-wider">
                        ORDEM: #{order.id.slice(0, 10).toUpperCase()}
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'COMPLETED' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                        order.status === 'SHIPPED' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                        order.status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        'bg-primary/10 border-primary/20 text-primary'
                      }`}>
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/20">
                         Produção: Cluster GR-01
                      </div>
                    </div>

                    <div className="space-y-4">
                      {order.items.map((item: OrderItem, i: number) => (
                        <div key={i} className="flex items-center gap-6 p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] group-hover:bg-white/[0.04] transition-colors">
                          <div className="w-16 h-16 rounded-xl bg-black/40 overflow-hidden border border-white/5">
                            <img src={item.image} loading="lazy" decoding="async" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" alt="" />
                          </div>
                          <div className="flex-1">
                             <p className="text-lg font-black font-display uppercase tracking-tight">{item.name}</p>
                             <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">QTD: {item.quantity}</span>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">PRONTO EM 24H</span>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end min-w-[200px]">
                    <div className="text-right">
                      <p className="text-[10px] text-white/30 uppercase font-black mb-2 tracking-widest">Comprometimento</p>
                      <div className="flex items-baseline gap-2 justify-end">
                         <span className="text-lg font-mono text-white/20">R$</span>
                         <p className="text-5xl font-display font-black text-shimmer leading-none">
                           {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                       <Button variant="outline" size="sm" className="h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-white/10 group-hover:border-primary/50 transition-all">
                          LAUDO TÉCNICO
                       </Button>
                       <Button size="sm" className="h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2">
                          LOGS <ChevronRight className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                </div>
                
                {/* Step progress indicator */}
                <div className="mt-10">
                  {(() => {
                    const steps = [
                      { label: "Pedido" },
                      { label: "Pagamento" },
                      { label: "Fila" },
                      { label: "Produção" },
                      { label: "Envio" },
                      { label: "Entregue" },
                    ];
                    const current = getStatusStep(order.status);
                    return (
                      <div className="relative">
                        {/* Connecting line behind dots */}
                        <div className="absolute top-[13px] left-0 right-0 h-px bg-white/[0.07] mx-6" />
                        <motion.div
                          className="absolute top-[13px] left-6 h-px bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(current / (steps.length - 1), 1) * (100 - 12)}%` }}
                          transition={{ duration: 1.2, ease: "circOut" }}
                        />
                        <div className="relative flex justify-between">
                          {steps.map((step, i) => {
                            const done = i < current;
                            const active = i === current;
                            return (
                              <div key={step.label} className="flex flex-col items-center gap-2">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  done
                                    ? "bg-primary border-primary"
                                    : active
                                    ? "bg-primary/20 border-primary animate-pulse"
                                    : "bg-surface border-white/10"
                                }`}>
                                  {done ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  ) : active ? (
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
                                  )}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-wider hidden sm:block ${
                                  done || active ? "text-white/50" : "text-white/15"
                                }`}>{step.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {order.trackingCode && order.status !== 'PENDING_PAYMENT' && (
                  <div className="mt-8 p-4 sm:p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                           <Truck className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                           <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Rastreio de Entrega</p>
                           <p className="text-sm font-mono text-white font-bold">{order.trackingCode}</p>
                        </div>
                     </div>
                     <Button variant="outline" className="border-white/10 hover:border-blue-500/50 hover:text-blue-400 gap-2 h-12" onClick={() => window.open(`https://rastreamento.correios.com.br/app/index.php`)}>
                        ACOMPANHAR <ChevronRight className="w-4 h-4" />
                     </Button>
                  </div>
                )}

                {order.status === 'PENDING_PAYMENT' && (
                  <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-primary/[0.02] border border-primary/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shrink-0 shadow-lg">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" loading="lazy" decoding="async" className="w-full object-contain" alt="Pix" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight text-white">Pagamento Pendente via Pix</h4>
                          <p className="text-[10px] text-white/40 font-medium italic">Copie o código abaixo ou escaneie o QR Code para faturar seu pedido.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const pixCode = "00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_" + order.id + "_" + (order.total || 0).toFixed(0);
                            navigator.clipboard.writeText(pixCode);
                            toast.success("Código Pix Copiado!", { description: "Cole no aplicativo do seu banco para pagar." });
                          }}
                          className="h-12 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/95 transition-all flex items-center gap-2"
                        >
                          Copiar Código Pix
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-white/5 items-center">
                      <div className="md:col-span-8 space-y-2">
                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Código Pix Copia e Cola</p>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-white/60 select-all break-all overflow-y-auto max-h-[80px]">
                          00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_{order.id}_{(order.total || 0).toFixed(0)}
                        </div>
                      </div>

                      <div className="md:col-span-4 flex justify-center sm:justify-end">
                        <div className="p-3 bg-white rounded-2xl flex flex-col items-center gap-1.5 w-[140px] shadow-2xl relative group">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("00020101021226830014br.gov.bcb.pix2561api.INOVAPRO3D.com.br/pix/qr/v2/cob/order_" + order.id + "_" + (order.total || 0).toFixed(0))}`}
                            loading="lazy"
                            decoding="async"
                            className="w-24 h-24"
                            alt="Pix QR Code"
                          />
                          <span className="text-[8px] font-black text-black/60 uppercase tracking-wider">Aponte a Câmera</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
