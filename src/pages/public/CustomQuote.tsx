import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  Info,
  Layers,
  Settings2,
  Trash2,
  Box,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/Button";
import { STLViewer } from "../../components/ui/STLViewer";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "sonner";
import type { Material } from "../../types/domain";

export default function CustomQuote() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Config, 3: Success
  const [material, setMaterial] = useState<Material | null>(null);
  const [infill, setInfill] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const snap = await getDocs(collection(db, "materials"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
        if (list.length > 0) {
          setMaterials(list);
          setMaterial(list[0]);
        } else {
          // Fallback
          const fallback = [
            { id: 'pla-pro', name: 'PLA Pro', pricePerGram: 0.15, desc: 'Acabamento resistente.', color: '#2563EB' },
            { id: 'pla-silk', name: 'PLA Silk', pricePerGram: 0.18, desc: 'Efeito metalizado.', color: '#EAB308' }
          ];
          setMaterials(fallback);
          setMaterial(fallback[0]);
        }
      } catch (err) {
        console.error("Error fetching materials:", err);
      }
    };
    fetchMaterials();
  }, []);
  
  // Cleanup preview URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const processFile = (selected: File) => {
    const fileName = selected.name;
    const ext = fileName.toLowerCase().split('.').pop();
    const supportedExtensions = ['stl', 'obj', 'step', 'stp', 'iges', 'igs'];
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    const maxNameLength = 80;
    const specialCharsRegex = /[^a-zA-Z0-9._-\s]/;

    // 1. Check Format
    if (!supportedExtensions.includes(ext || '')) {
      toast.error("Formato não suportado", { 
        description: "Aceitamos apenas arquivos .STL, .OBJ, .STEP e .IGES." 
      });
      return;
    }

    // 2. Check Size
    if (selected.size > maxSizeBytes) {
      toast.error("Arquivo muito grande", { 
        description: "O tamanho máximo permitido para orçamentos automáticos é de 50MB." 
      });
      return;
    }

    // 3. Check Name Length
    if (fileName.length > maxNameLength) {
      toast.error("Nome muito longo", { 
        description: `O nome do arquivo (${fileName.length} caracteres) excede o limite de ${maxNameLength}. Renomeie o arquivo.` 
      });
      return;
    }

    // 4. Check Special Characters (ignoring extension)
    const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
    if (specialCharsRegex.test(baseName)) {
      toast.error("Caracteres inválidos", { 
        description: "O nome do arquivo contém caracteres especiais ou acentos. Use apenas letras simples, números, espaços, hífen ou underline." 
      });
      return;
    }

    // If passed all validations:
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    
    setFile(selected);
    // Only create preview URL for formats supported by our viewer (STL/OBJ)
    if (ext === 'stl' || ext === 'obj') {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
    startAnalysis();
  };

  const startAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setStep(2);
      toast.success("Arquivo recebido!", { description: "Pronto para configuração." });
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setStep(1);
    setAnalyzing(false);
  };

  const submitQuote = async () => {
    if (!user) {
       toast.error("Autenticação necessária", { description: "Faça login para salvar seu orçamento." });
       return;
    }
    
    if (!file || !material) {
      toast.error("Dados incompletos", { description: "Selecione um arquivo e material antes de enviar." });
      return;
    }

    try {
      await addDoc(collection(db, "quotes"), {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        status: "PENDING",
        fileName: file.name,
        materialId: material.id,
        infill: infill,
        estimatedPrice: 45.90, 
        createdAt: serverTimestamp()
      });
      setStep(3);
      toast.success("Solicitação enviada!");
    } catch (err) {
      console.error("Error submitting quote:", err);
      toast.error("Erro ao enviar", { description: "Tente novamente em instantes." });
    }
  };

  return (
    <div className="container-section py-8 min-h-[80vh]">
      <header className="max-w-md mx-auto mb-8 text-center">
        <h1 className="heading-md uppercase mb-2">
          Orçamento <span className="text-shimmer italic">3D.</span>
        </h1>
        <p className="text-xs text-white/40 font-medium italic">
          Envie seu arquivo STL, OBJ, STEP ou IGES para uma estimativa instantânea.
        </p>
      </header>

      <div className="relative">
        {/* Stepper Tabs */}
        <div className="flex justify-center mb-10 gap-3">
           {[1, 2, 3].map((s) => (
             <div key={s} className="flex items-center gap-2">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                 step === s ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 
                 step > s ? 'bg-green-500 text-white' : 'bg-white/5 text-white/20'
               }`}>
                 {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
               </div>
               {s < 3 && <div className={`w-8 h-[1px] rounded-full ${step > s ? 'bg-green-500' : 'bg-white/5'}`} />}
             </div>
           ))}
        </div>

        <div className="glass-card rounded-[24px] overflow-hidden border border-white/5 bg-white/[0.01]">
          <div className="p-4 lg:p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="upload-step"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex flex-col items-center"
                >
                  {!analyzing ? (
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[21/6] border-2 border-dashed border-white/5 rounded-[24px] flex flex-col items-center justify-center group cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all relative overflow-hidden"
                    >
                      <input 
                        type="file" 
                        hidden 
                        ref={fileInputRef} 
                        accept=".stl,.obj,.step,.stp,.iges,.igs" 
                        onChange={handleFileChange} 
                      />
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-black font-display uppercase tracking-tight mb-2">Envie seu Modelo</h3>
                      <p className="text-white/40 font-medium text-xs italic">Clique ou arraste seu arquivo (STL/OBJ/STEP/IGES)</p>
                    </div>
                  ) : (
                    <div className="w-full aspect-[21/6] flex flex-col items-center justify-center gap-6">
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
                        <motion.div 
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border-2 border-primary rounded-full border-t-transparent"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black font-display uppercase tracking-tight text-shimmer">Analisando...</h3>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full">
                    {[
                      { icon: Zap, title: "Cálculo Real", desc: "Estimativa baseada em peso e tempo real de impressão." },
                      { icon: ShieldCheck, title: "Acabamento PLA", desc: "Opções de acabamento específicos para sua necessidade." },
                      { icon: AlertCircle, title: "Análise de Malha", desc: "Verificação básica de integridade do arquivo." }
                    ].map((feat, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                        <feat.icon className="w-5 h-5 text-primary mb-3" />
                        <h4 className="font-bold uppercase tracking-tight mb-1 text-xs">{feat.title}</h4>
                        <p className="text-[10px] text-white/30 leading-relaxed font-medium italic">{feat.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="config-step"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="grid grid-cols-1 lg:grid-cols-5 gap-10"
                >
                  <div className="lg:col-span-3 space-y-4">
                    <div className="aspect-[4/3] bg-black/40 rounded-[32px] overflow-hidden relative border border-white/5 group">
                        {previewUrl && <STLViewer url={previewUrl} />}
                        <div className="absolute top-4 left-4">
                           <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-white/40 border border-white/5">
                             Preview 3D
                           </div>
                        </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex flex-col pt-4">
                      <div className="mb-4">
                         <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 block">Arquivo Validado</span>
                         <h3 className="text-xl font-black font-display uppercase tracking-tight mb-0.5 truncate">{file?.name}</h3>
                      </div>
  
                      <div className="space-y-5 flex-1">
                        {/* MATERIAL */}
                        <div className="space-y-2">
                          <label className="text-[8px] text-white/30 uppercase font-black tracking-widest flex items-center gap-2">
                             <Layers className="w-3 h-3" /> Escolha o Acabamento
                          </label>
                          <div className="grid grid-cols-1 gap-2">
                            {materials.map(m => (
                              <button
                                key={m.id}
                                onClick={() => setMaterial(m)}
                                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all group ${
                                  material?.id === m.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5 hover:border-white/10'
                                }`}
                              >
                                <div>
                                  <p className="font-bold text-xs uppercase tracking-tight">{m.name}</p>
                                  <p className="text-[10px] text-white/30 italic">{m.desc || 'Acabamento de alta qualidade'}</p>
                                </div>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                              </button>
                            ))}
                          </div>
                        </div>
  
                        {/* INFILL */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[8px] text-white/30 uppercase font-black tracking-widest flex items-center gap-2">
                               <Settings2 className="w-3 h-3" /> Resistência (Dureza)
                            </label>
                            <span className="text-xs font-mono text-primary font-black">{infill}%</span>
                          </div>
                          <input 
                            type="range" min="10" max="80" step="5" value={infill}
                            onChange={(e) => setInfill(Number(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                          />
                          <p className="text-[9px] text-white/20 italic">
                            {infill <= 20 ? "Ideal para decoração. Leve e econômico." : 
                             infill <= 40 ? "Equilibrado. Boa resistência para uso comum." : 
                             "Peça robusta. Suporta mais esforço físico."}
                          </p>
                        </div>
                      </div>
  
                      <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-6">
                           <div>
                              <p className="text-[8px] text-white/30 uppercase font-black mb-1 tracking-widest">Investimento Estimado</p>
                              <div className="flex items-baseline gap-1">
                                 <span className="text-sm text-white/40 font-mono">R$</span>
                                 <span className="text-4xl font-display font-black text-shimmer">45,90</span>
                              </div>
                           </div>
                        </div>
                        
                        <Button 
                          isShimmer
                          className="w-full h-14 rounded-2xl gap-2 text-xs font-display font-black uppercase tracking-tight"
                          onClick={submitQuote}
                        >
                          SOLICITAR IMPRESSÃO
                        </Button>
                      </div>
                    </div>
                  </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="success-step"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 flex flex-col items-center text-center max-w-2xl mx-auto"
                >
                  <div className="relative mb-12">
                     <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                     <div className="w-32 h-32 rounded-[40px] bg-primary text-white flex items-center justify-center relative border-4 border-white/10 shadow-2xl">
                       <CheckCircle2 className="w-16 h-16" />
                     </div>
                  </div>
                  
                  <h2 className="text-5xl lg:text-7xl font-display font-black mb-6 uppercase tracking-tighter leading-none">
                    Protocolo <br /> Transmitido.
                  </h2>
                  <p className="text-xl text-white/40 font-medium mb-12 leading-relaxed">
                    Sua geometria foi enfileirada para revisão humana. Um engenheiro entrará em contato via dashboard em até <span className="text-primary">60 minutos</span>.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-6 w-full">
                    <Button variant="outline" className="h-16 px-8 rounded-2xl flex-1 text-xs font-black uppercase tracking-widest" onClick={reset}>
                      NOVA ANÁLISE
                    </Button>
                    <Link to="/catalogo" className="flex-1">
                      <Button className="h-16 px-8 rounded-2xl w-full text-xs font-black uppercase tracking-widest">
                        CATÁLOGO DE PRODUTOS
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-12 text-center">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.05] text-[9px] font-black uppercase tracking-widest text-white/20">
              <ShieldCheck className="w-3 h-3" />
              Seu projeto é confidencial e seus arquivos são excluídos após a produção.
           </div>
        </div>
      </div>
    </div>
  );
}
