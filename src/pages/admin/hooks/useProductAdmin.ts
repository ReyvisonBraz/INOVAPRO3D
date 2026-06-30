import { FormEvent, useCallback, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { auth, db, handleFirestoreError, OperationType, getStorageInstance } from "../../../services/firebase";
import {
  MATERIAL_PRESETS,
  DEFAULT_MACHINE,
  DEFAULT_ENERGY,
  DEFAULT_FAILURE_RATE,
  computePricing,
} from "../../../lib/pricing";
import {
  formatCatalogTitle,
  formatCatalogDescription,
  importAndConvertImage,
} from "../../../lib/adminHelpers";
import type { Category, Product } from "../../../types/domain";

const STATIC_CATEGORIES = ["DECORAÇÃO", "UTILITÁRIOS", "ACTION FIGURES", "ORGANIZADORES", "MODA", "GAMES", "PERSONALIZADO", "OUTROS"];

const defaultProduct = {
  name: "",
  description: "",
  basePrice: 0,
  category: "DECORAÇÃO",
  images: [""],
  active: true,
  stock: 0,
  tags: [] as string[],
  technical: { infill: 20, resolution: "0.20mm", printTime: "2h 30m", weight: 80 },
  sourceUrl: "",
  modelUrl: "",
  baseDimensions: { x: 120, y: 120, z: 150 },
  hideDimensions: false,
};

interface Deps {
  categories: Category[];
  fetchData: () => Promise<void>;
}

/** Estado e ações do CRUD de produtos: formulário, importação por link e imagens. */
export function useProductAdmin({ categories, fetchData }: Deps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productImportUrl, setProductImportUrl] = useState("");
  const [isImportingProduct, setIsImportingProduct] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [translatingField, setTranslatingField] = useState<"name" | "description" | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState(defaultProduct);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [importingImage, setImportingImage] = useState(false);

  const resetNewProduct = useCallback(() => {
    setNewProduct(defaultProduct);
    setProductImportUrl("");
  }, []);

  const handleProductSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      try {
        if (isEditingProduct && selectedProduct) {
          await updateDoc(doc(db, "products", selectedProduct.id), { ...newProduct, updatedAt: serverTimestamp() });
          toast.success("Produto atualizado com sucesso!");
        } else {
          await addDoc(collection(db, "products"), { ...newProduct, createdAt: serverTimestamp() });
          toast.success("Produto adicionado ao catálogo!");
        }
        setIsAddingProduct(false);
        setIsEditingProduct(false);
        setNewProduct(defaultProduct);
        setProductImportUrl("");
        fetchData();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, "products");
      }
    },
    [isEditingProduct, selectedProduct, newProduct, fetchData]
  );

  const handleImportProductMetadata = useCallback(async () => {
    const url = productImportUrl.trim();
    if (!url) {
      toast.error("Informe o link do modelo antes de importar.");
      return;
    }
    try {
      setIsImportingProduct(true);
      const response = await fetch(`/api/model-metadata?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível importar este link.");

      const importedImages = Array.isArray(data.images)
        ? data.images.filter((image: unknown): image is string => typeof image === "string" && image.length > 0)
        : [];

      setNewProduct((current) => ({
        ...current,
        name: formatCatalogTitle(data.title || current.name),
        description: formatCatalogDescription(data.description || current.description),
        images: importedImages.length > 0 ? importedImages : current.images,
        sourceUrl: data.sourceUrl || url,
        modelUrl: data.modelUrl || current.modelUrl,
        tags: Array.from(new Set([
          ...current.tags, data.sourceHost, data.author, data.license,
          ...(Array.isArray(data.tags) ? data.tags : []),
        ].filter(Boolean))),
        technical: { ...current.technical, ...(data.technical || {}) },
      }));

      // Converte automaticamente as imagens externas para WebP no Storage.
      // Mantém a URL original como fallback caso a conversão falhe (CORS, etc).
      if (importedImages.length > 0) {
        const toastId = toast.loading(`Otimizando ${importedImages.length} ${importedImages.length === 1 ? "imagem" : "imagens"} para WebP...`);
        try {
          const { getStorage } = await import("firebase/storage");
          const bucket = getStorage();
          let okCount = 0;
          const converted = await Promise.all(
            importedImages.map(async (img: string) => {
              try {
                const r = await importAndConvertImage(img, bucket);
                okCount++;
                return r.url;
              } catch {
                return img; // mantém original se a conversão falhar
              }
            })
          );
          setNewProduct((current) => ({ ...current, images: converted }));
          if (okCount === importedImages.length) {
            toast.success(`${okCount} ${okCount === 1 ? "imagem otimizada" : "imagens otimizadas"} para WebP!`, { id: toastId });
          } else {
            toast.warning(`${okCount}/${importedImages.length} imagens convertidas. As demais mantêm o link original.`, { id: toastId });
          }
        } catch {
          toast.error("Não foi possível otimizar as imagens. Os links originais foram mantidos.", { id: toastId });
        }
      }

      const importedTech = { ...(data.technical || {}) };
      const weightG = Number(importedTech.weight) || 0;
      const hMatch = String(importedTech.printTime || "").match(/(\d+)\s*h/i);
      const mMatch = String(importedTech.printTime || "").match(/(\d+)\s*m/i);
      const printTimeH = (hMatch ? Number(hMatch[1]) : 0) + (mMatch ? Number(mMatch[1]) / 60 : 0);
      if (weightG > 0 && printTimeH > 0) {
        try {
          const suggested = computePricing({
            material: "pla", weightGrams: weightG, hours: printTimeH, quantity: 1,
            reservePct: MATERIAL_PRESETS.pla.defaultReservePct,
            failureRatePct: DEFAULT_FAILURE_RATE,
            machine: DEFAULT_MACHINE,
            kwhCost: DEFAULT_ENERGY.kwhCost,
            startupPowerWatts: DEFAULT_ENERGY.startupPowerWatts,
            startupMinutes: DEFAULT_ENERGY.startupMinutes,
            laborHours: 0, laborRate: 0, extraSupplies: 0,
            wholesaleMarkup: 1.8, retailMarkup: 2.5, minPrice: 15,
          });
          setNewProduct((p) => ({ ...p, basePrice: parseFloat(suggested.retailUnit.toFixed(2)) }));
          toast.info(`Preço sugerido: R$ ${suggested.retailUnit.toFixed(2)} (varejo unitário)`, { duration: 5000 });
        } catch (err) { console.error("Price suggestion failed:", err); }
      }
      toast.success("Metadados importados. Revise o preço antes de salvar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar metadados.");
    } finally {
      setIsImportingProduct(false);
    }
  }, [productImportUrl]);

  const handleProductImageUpload = useCallback(async (file: File | null) => {
    if (!file || !auth.currentUser) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return; }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) { toast.error("Imagem excede 5MB. Reduza o tamanho antes de enviar."); return; }
    try {
      setIsUploadingProductImage(true);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = file.name.replace(/\.[^.]+$/, "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "imagem";
      const path = `products/manual/${auth.currentUser.uid}/${Date.now()}-${safeName}.${extension}`;
      const fileRef = storageRef(await getStorageInstance(), path);
      await uploadBytes(fileRef, file, { contentType: file.type, customMetadata: { uploadedBy: auth.currentUser.uid, source: "admin-product-form" } });
      const downloadUrl = await getDownloadURL(fileRef);
      setNewProduct((current) => ({ ...current, images: [...current.images.filter(Boolean), downloadUrl] }));
      toast.success("Imagem enviada e adicionada ao produto.");
    } catch {
      toast.error("Erro ao enviar imagem.");
    } finally {
      setIsUploadingProductImage(false);
    }
  }, []);

  const handleImportImageUrl = useCallback(async (url: string, addFn: (u: string) => void) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setImportingImage(true);
    try {
      const { getStorage } = await import("firebase/storage");
      const result = await importAndConvertImage(trimmed, getStorage());
      addFn(result.url);
      toast.success("Imagem convertida para WebP e salva no Storage!");
    } catch {
      addFn(trimmed);
      toast.warning("CORS bloqueou a conversão — URL original mantida.", { duration: 3500 });
    } finally {
      setImportingImage(false);
      setNewImageUrl("");
    }
  }, []);

  const handleDuplicateProduct = useCallback((product: Product) => {
    const { id, createdAt, updatedAt, ...rest } = product;
    setNewProduct({
      ...rest,
      name: `${rest.name} (Cópia)`,
      sourceUrl: rest.sourceUrl || "",
      modelUrl: rest.modelUrl || "",
      active: rest.active !== undefined ? rest.active : true,
      stock: rest.stock || 0,
      tags: rest.tags || [],
      technical: {
        infill: rest.technical?.infill ?? 20,
        resolution: rest.technical?.resolution || "0.20mm",
        printTime: rest.technical?.printTime || "2h 30m",
        weight: rest.technical?.weight ?? 80,
      },
      baseDimensions: rest.baseDimensions || { x: 120, y: 120, z: 150 },
      hideDimensions: rest.hideDimensions ?? false,
      images: rest.images || [""],
    });
    setIsAddingProduct(true);
    toast.info("Protótipo duplicado. Ajuste os detalhes antes de salvar.");
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setIsEditingProduct(true);
    setProductImportUrl(product.sourceUrl || "");
    setNewProduct({
      name: product.name || "",
      description: product.description || "",
      basePrice: product.basePrice || 0,
      category: product.category || "DECORAÇÃO",
      images: product.images || [""],
      active: product.active !== undefined ? product.active : true,
      stock: product.stock || 0,
      tags: product.tags || [],
      technical: {
        infill: product.technical?.infill ?? 20,
        resolution: product.technical?.resolution || "0.20mm",
        printTime: product.technical?.printTime || "2h 30m",
        weight: product.technical?.weight ?? 80,
      },
      sourceUrl: product.sourceUrl || "",
      modelUrl: product.modelUrl || "",
      baseDimensions: product.baseDimensions || { x: 120, y: 120, z: 150 },
      hideDimensions: product.hideDimensions ?? false,
    });
  }, []);

  const handleUpdateStock = useCallback(async (id: string, currentStock: number, delta: number) => {
    try {
      const newStock = Math.max(0, currentStock + delta);
      await updateDoc(doc(db, "products", id), { stock: newStock, updatedAt: serverTimestamp() });
      toast.success("Estoque atualizado!");
      fetchData();
    } catch {
      toast.error("Falha ao atualizar estoque.");
    }
  }, [fetchData]);

  const allCategories = useMemo(() => {
    const fromCollection = categories.filter(c => c.active !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map(c => c.name);
    const base = fromCollection.length > 0 ? fromCollection : STATIC_CATEGORIES;
    return Array.from(new Set([...base, ...customCategories])).sort();
  }, [customCategories, categories]);

  return {
    selectedProduct, setSelectedProduct,
    isAddingProduct, setIsAddingProduct,
    isEditingProduct, setIsEditingProduct,
    productImportUrl, setProductImportUrl,
    isImportingProduct,
    isUploadingProductImage,
    translatingField, setTranslatingField,
    customCategories, setCustomCategories,
    newProduct, setNewProduct,
    newImageUrl, setNewImageUrl,
    importingImage,
    allCategories,
    resetNewProduct,
    handleProductSubmit,
    handleImportProductMetadata,
    handleProductImageUpload,
    handleImportImageUrl,
    handleDuplicateProduct,
    handleEditProduct,
    handleUpdateStock,
  };
}
