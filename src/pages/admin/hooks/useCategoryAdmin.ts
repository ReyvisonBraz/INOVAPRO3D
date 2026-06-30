import { Dispatch, FormEvent, SetStateAction, useCallback, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { auth, db, getStorageInstance } from "../../../services/firebase";
import { generateSlug } from "../../../lib/categoryTree";
import type { Category } from "../../../types/domain";

interface Deps {
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  fetchData: () => Promise<void>;
}

/** Estado e ações do CRUD de pastas/categorias do catálogo. */
export function useCategoryAdmin({ categories, setCategories, fetchData }: Deps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", image: "", active: true, parentId: "" });
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);

  const handleCategorySubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    try {
      const name = newCategory.name.trim().toUpperCase();
      const slug = generateSlug(name);
      const data: Record<string, unknown> = {
        name,
        slug,
        active: newCategory.active,
        parentId: newCategory.parentId || null,
        order: categories.length,
        updatedAt: serverTimestamp(),
      };
      if (newCategory.image) data.image = newCategory.image;
      if (isEditingCategory && editingCategoryId) {
        await updateDoc(doc(db, "categories", editingCategoryId), data);
        toast.success("Pasta atualizada!");
      } else {
        await addDoc(collection(db, "categories"), { ...data, createdAt: serverTimestamp() });
        toast.success("Pasta criada!");
      }
      setIsAddingCategory(false); setIsEditingCategory(false); setEditingCategoryId(null);
      setNewCategory({ name: "", image: "", active: true, parentId: "" });
      await fetchData();
    } catch (err: any) {
      console.error("[categoria] falha ao salvar pasta:", err);
      const code = err?.code ? ` (${err.code})` : "";
      toast.error(`${err?.message || "Erro ao salvar pasta."}${code}`);
    }
  }, [newCategory, isEditingCategory, editingCategoryId, categories.length, fetchData]);

  const handleCategoryImageUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!auth.currentUser) { toast.error("Sessão expirada. Entre novamente."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return; }
    // A regra do Storage exige < 10 MB. Barramos antes (com margem) para dar
    // um erro claro em vez de um "permission denied" da regra.
    const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande. Use uma de até 8 MB.");
      return;
    }
    setIsUploadingCategoryImage(true);
    try {
      const path = `categories/covers/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const fileRef = storageRef(await getStorageInstance(), path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setNewCategory(prev => ({ ...prev, image: url }));
      toast.success("Capa enviada!");
    } catch (err: any) {
      console.error("[categoria] falha no upload da capa:", err);
      const code = err?.code ? ` (${err.code})` : "";
      toast.error(`Erro ao enviar imagem${code}.`);
    }
    finally { setIsUploadingCategoryImage(false); }
  }, []);

  const handleToggleCategoryActive = useCallback(async (id: string, current: boolean) => {
    await updateDoc(doc(db, "categories", id), { active: !current, updatedAt: serverTimestamp() });
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
    toast.success(current ? "Pasta ocultada." : "Pasta visível.");
  }, [setCategories]);

  const handleReorderCategory = useCallback(async (id: string, direction: "up" | "down") => {
    const sorted = [...categories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const idx = sorted.findIndex(c => c.id === id);
    if (idx < 0) return;
    const target = direction === "up" ? Math.max(0, idx - 1) : Math.min(sorted.length - 1, idx + 1);
    if (target === idx) return;
    [sorted[idx], sorted[target]] = [sorted[target], sorted[idx]];
    const updates = sorted.map((c, i) => updateDoc(doc(db, "categories", c.id), { order: i }));
    await Promise.all(updates);
    setCategories(sorted.map((c, i) => ({ ...c, order: i })));
  }, [categories, setCategories]);

  return {
    isAddingCategory, setIsAddingCategory,
    isEditingCategory, setIsEditingCategory,
    editingCategoryId, setEditingCategoryId,
    newCategory, setNewCategory,
    isUploadingCategoryImage,
    handleCategorySubmit,
    handleCategoryImageUpload,
    handleToggleCategoryActive,
    handleReorderCategory,
  };
}
