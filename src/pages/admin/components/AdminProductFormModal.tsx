import { Dispatch, SetStateAction } from "react";
import { Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";
import {
  formatCatalogDescription,
  formatCatalogTitle,
  NumInput,
  translateToBR,
} from "../../../lib/adminHelpers";
import type { ProductDraft } from "../hooks/useProductAdmin";

interface AdminProductFormModalProps {
  isEditing: boolean;
  product: ProductDraft;
  setProduct: Dispatch<SetStateAction<ProductDraft>>;
  allCategories: string[];
  onAddCustomCategory: Dispatch<SetStateAction<string[]>>;
  importUrl: string;
  setImportUrl: (url: string) => void;
  isImportingMetadata: boolean;
  onImportMetadata: () => void;
  isUploadingImage: boolean;
  onUploadImage: (file: File | null) => void;
  imageUrlDraft: string;
  setImageUrlDraft: (url: string) => void;
  isImportingImage: boolean;
  onImportImageUrl: (url: string, addFn: (u: string) => void) => void;
  translatingField: "name" | "description" | null;
  setTranslatingField: (field: "name" | "description" | null) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export function AdminProductFormModal({
  isEditing,
  product,
  setProduct,
  allCategories,
  onAddCustomCategory,
  importUrl,
  setImportUrl,
  isImportingMetadata,
  onImportMetadata,
  isUploadingImage,
  onUploadImage,
  imageUrlDraft,
  setImageUrlDraft,
  isImportingImage,
  onImportImageUrl,
  translatingField,
  setTranslatingField,
  onSubmit,
  onClose,
}: AdminProductFormModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl overflow-y-auto no-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-white/10 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 max-w-4xl w-full relative my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-dim hover:text-red-500 transition-all"
        >
          <X className="w-8 h-8" />
        </button>
        <h2 className="text-3xl font-black italic tracking-tighter mb-8 leading-none">
          {isEditing ? "Editar Produto" : "Cadastrar Item"}
          <br />
          <span className="text-primary text-sm uppercase tracking-widest mt-2 block">
            {isEditing ? "Ajuste de Catálogo" : "Registro de Manufatura"}
          </span>
        </h2>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Source URL import */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Cole um link público do modelo, ex: MakerWorld/Bambu Lab"
                className="min-w-0 flex-1 bg-black border border-white/10 rounded-2xl p-4 text-xs font-mono outline-none focus:border-primary/50 transition-all"
              />
              <Button
                type="button"
                onClick={onImportMetadata}
                disabled={isImportingMetadata}
                className="rounded-2xl px-6 h-12 text-[10px] font-black uppercase tracking-widest"
              >
                {isImportingMetadata ? "Importando..." : "Importar"}
              </Button>
            </div>
            {product.sourceUrl && (
              <p className="text-[11px] text-secondary font-mono break-all">
                Origem: {product.sourceUrl}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                  Identidade do Item
                </label>
                <button
                  type="button"
                  disabled={!product.name || translatingField === "name"}
                  onClick={async () => {
                    setTranslatingField("name");
                    try {
                      const t = await translateToBR(product.name);
                      setProduct((p) => ({ ...p, name: formatCatalogTitle(t) }));
                    } catch {
                      toast.error("Falha na tradução.");
                    } finally {
                      setTranslatingField(null);
                    }
                  }}
                  className="text-[11px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors disabled:opacity-30 flex items-center gap-1 shrink-0"
                >
                  {translatingField === "name" ? "traduzindo..." : "Traduzir PT"}
                </button>
              </div>
              <input
                required
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                placeholder="Ex: Luminária Cyberpunk"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                Status & Disponibilidade
              </label>
              <div className="flex items-center gap-4 h-14 bg-white/5 border border-white/10 rounded-2xl px-4">
                <button
                  type="button"
                  onClick={() => setProduct({ ...product, active: !product.active })}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    product.active
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500",
                  )}
                >
                  {product.active ? "Ativo" : "Inativo"}
                </button>
                <div className="h-6 w-px bg-white/10" />
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[9px] font-black uppercase text-dim">Estoque:</label>
                  <NumInput
                    min={0}
                    value={product.stock || 0}
                    onChange={(v) => setProduct({ ...product, stock: Math.round(v) })}
                    className="bg-transparent border-none outline-none text-xs font-bold text-white w-12"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                Preço Base (R$)
              </label>
              <NumInput
                min={0}
                step={0.01}
                value={product.basePrice}
                onChange={(v) => setProduct({ ...product, basePrice: v })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                Setor / Categoria
              </label>
              <select
                value={product.category}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                className="w-full bg-[#050508] border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-display text-[11px]"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="+ Nova categoria (Enter para adicionar)"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-primary/50 transition-all text-white placeholder:text-dim"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                      if (val && !allCategories.includes(val)) {
                        onAddCustomCategory((prev) => [...prev, val]);
                        setProduct((p) => ({ ...p, category: val }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-dim">
              Material de produção (interno)
            </label>
            <select
              value={product.productionMaterial ?? "PLA"}
              onChange={(e) =>
                setProduct({
                  ...product,
                  productionMaterial: e.target.value as "PLA" | "SILK" | "PETG",
                })
              }
              className="w-full bg-[#050508] border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all"
            >
              <option value="PLA">PLA</option>
              <option value="SILK">SILK</option>
              <option value="PETG">PETG</option>
            </select>
            <p className="text-[10px] text-dim">Usado pela produção e oculto para o cliente.</p>
          </div>
          {/* Images */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-dim">
              Fotos do Produto
            </label>
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
              <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Enviar imagem manual
                  </span>
                  <p className="text-[11px] uppercase tracking-widest text-secondary mt-1">
                    JPG, PNG ou WEBP.
                  </p>
                </div>
                <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                  {isUploadingImage ? "Enviando..." : "Escolher arquivo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingImage}
                  onChange={(e) => {
                    void onUploadImage(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>
            {product.images.filter(Boolean).length > 0 && (
              <div className="space-y-1.5">
                {product.images.filter(Boolean).map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="flex items-center gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] group"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-black/20"
                      loading="lazy"
                    />
                    <span className="text-[11px] font-black uppercase tracking-widest text-secondary w-8 shrink-0 text-center">
                      {idx === 0 ? "CAPA" : `#${idx + 1}`}
                    </span>
                    <span className="flex-1 min-w-0 text-[9px] font-mono text-secondary truncate hidden sm:block">
                      {url}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Mover para cima"
                        disabled={idx === 0}
                        onClick={() => {
                          const imgs = [...product.images.filter(Boolean)];
                          [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]];
                          setProduct((p) => ({ ...p, images: imgs }));
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Mover para baixo"
                        disabled={idx === product.images.filter(Boolean).length - 1}
                        onClick={() => {
                          const imgs = [...product.images.filter(Boolean)];
                          [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]];
                          setProduct((p) => ({ ...p, images: imgs }));
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        title="Remover"
                        onClick={() => {
                          const imgs = product.images.filter(Boolean).filter((_, i) => i !== idx);
                          setProduct((p) => ({
                            ...p,
                            images: imgs.length > 0 ? imgs : [""],
                          }));
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Cole uma URL de imagem (Bambu Lab, etc.)..."
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onImportImageUrl(imageUrlDraft, (u) =>
                      setProduct((p) => ({
                        ...p,
                        images: [...p.images.filter(Boolean), u],
                      })),
                    );
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-primary/50 transition-all"
              />
              <button
                type="button"
                disabled={isImportingImage}
                onClick={() =>
                  onImportImageUrl(imageUrlDraft, (u) =>
                    setProduct((p) => ({
                      ...p,
                      images: [...p.images.filter(Boolean), u],
                    })),
                  )
                }
                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[64px]"
              >
                {isImportingImage ? "..." : "Importar"}
              </button>
            </div>
          </div>
          {/* Model URLs */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-dim">
              Link do Arquivo STL / Modelo 3D
            </label>
            <input
              value={product.modelUrl || ""}
              onChange={(e) => setProduct({ ...product, modelUrl: e.target.value })}
              placeholder="Ex: /cube.stl ou link HTTPS"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-dim">
              Link de Origem / Download do Modelo
            </label>
            <input
              value={product.sourceUrl || ""}
              onChange={(e) => setProduct({ ...product, sourceUrl: e.target.value })}
              placeholder="Link da página do modelo ou download externo"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all font-mono text-xs"
            />
          </div>
          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 sm:p-6 rounded-3xl border border-white/5">
            <div className="col-span-3 flex items-center justify-between gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                Dimensões Base do Modelo (mm)
              </label>
              <button
                type="button"
                onClick={() => setProduct({ ...product, hideDimensions: !product.hideDimensions })}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                  product.hideDimensions
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-white/5 text-dim border-white/10 hover:text-white",
                )}
                title="Mostrar ou ocultar as medidas na página pública do produto"
              >
                {product.hideDimensions ? "Medidas ocultas" : "Medidas visíveis"}
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-white/40">
                Eixo X (Largura)
              </label>
              <NumInput
                min={0}
                value={product.baseDimensions?.x || 120}
                onChange={(v) =>
                  setProduct({
                    ...product,
                    baseDimensions: {
                      ...(product.baseDimensions || { x: 120, y: 120, z: 150 }),
                      x: Math.round(v),
                    },
                  })
                }
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-white/40">
                Eixo Y (Comprimento)
              </label>
              <NumInput
                min={0}
                value={product.baseDimensions?.y || 120}
                onChange={(v) =>
                  setProduct({
                    ...product,
                    baseDimensions: {
                      ...(product.baseDimensions || { x: 120, y: 120, z: 150 }),
                      y: Math.round(v),
                    },
                  })
                }
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-white/40">
                Eixo Z (Altura)
              </label>
              <NumInput
                min={0}
                value={product.baseDimensions?.z || 150}
                onChange={(v) =>
                  setProduct({
                    ...product,
                    baseDimensions: {
                      ...(product.baseDimensions || { x: 120, y: 120, z: 150 }),
                      z: Math.round(v),
                    },
                  })
                }
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-primary/50 transition-colors text-center"
              />
            </div>
          </div>
          {/* Technical specs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 p-4 sm:p-6 bg-white/5 rounded-3xl border border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim">Resolução</label>
              <input
                value={product.technical.resolution}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    technical: { ...product.technical, resolution: e.target.value },
                  })
                }
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim">Infill (%)</label>
              <NumInput
                min={0}
                max={100}
                value={product.technical.infill}
                onChange={(v) =>
                  setProduct({
                    ...product,
                    technical: { ...product.technical, infill: Math.round(v) },
                  })
                }
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim">Tempo</label>
              <input
                value={product.technical.printTime}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    technical: { ...product.technical, printTime: e.target.value },
                  })
                }
                placeholder="4h 30m"
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-dim">Peso Base (g)</label>
              <NumInput
                min={0}
                value={product.technical.weight || 80}
                onChange={(v) =>
                  setProduct({
                    ...product,
                    technical: { ...product.technical, weight: Math.round(v) },
                  })
                }
                className="w-full bg-black border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                Descrição Técnica / Marketing
              </label>
              <button
                type="button"
                disabled={!product.description || translatingField === "description"}
                onClick={async () => {
                  setTranslatingField("description");
                  try {
                    const t = await translateToBR(product.description);
                    setProduct((p) => ({
                      ...p,
                      description: formatCatalogDescription(t),
                    }));
                  } catch {
                    toast.error("Falha na tradução.");
                  } finally {
                    setTranslatingField(null);
                  }
                }}
                className="text-[11px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors disabled:opacity-30 flex items-center gap-1 shrink-0"
              >
                {translatingField === "description" ? "traduzindo..." : "Traduzir PT"}
              </button>
            </div>
            <textarea
              rows={3}
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary/50 transition-all resize-none"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-16 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] italic"
          >
            Finalizar Protocolo de Registro
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
