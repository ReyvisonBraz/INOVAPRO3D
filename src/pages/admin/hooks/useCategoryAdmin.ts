import { Dispatch, FormEvent, SetStateAction, useCallback, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  type UpdateData,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { auth, db, getStorageInstance } from "../../../services/firebase";
import { findCategoryNameConflict, generateSlug } from "../../../lib/categoryTree";
import type { Category } from "../../../types/domain";

export interface CategoryDraft {
  name: string;
  description: string;
  image: string;
  active: boolean;
  parentId: string;
}

interface Deps {
  categories: Category[];
  setCategories: Dispatch<SetStateAction<Category[]>>;
  fetchData: () => Promise<void>;
}

/** Estado e ações do CRUD de categorias do catálogo. */
export function useCategoryAdmin({ categories, setCategories, fetchData }: Deps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<CategoryDraft>({
    name: "",
    description: "",
    image: "",
    active: true,
    parentId: "",
  });
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);

  const handleCategorySubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!newCategory.name.trim()) return;
      const requestedParent = categories.find((category) => category.id === newCategory.parentId);
      if (requestedParent?.parentId) {
        toast.error("Use apenas uma categoria principal como destino.");
        return;
      }
      if (isEditingCategory && editingCategoryId && newCategory.parentId) {
        const byId = new Map(categories.map((category) => [category.id, category]));
        let parentId: string | null | undefined = newCategory.parentId;
        while (parentId) {
          if (parentId === editingCategoryId) {
            toast.error("Uma categoria não pode ficar dentro dela mesma ou de uma subcategoria.");
            return;
          }
          parentId = byId.get(parentId)?.parentId;
        }
      }
      const nameConflict = findCategoryNameConflict(
        categories,
        newCategory.name,
        newCategory.parentId,
        editingCategoryId,
      );
      if (nameConflict) {
        toast.error(
          newCategory.parentId
            ? `Esta categoria já tem uma subcategoria chamada "${nameConflict.name}".`
            : `Já existe uma categoria principal chamada "${nameConflict.name}".`,
        );
        return;
      }
      try {
        const name = newCategory.name.trim().toUpperCase();
        const slug = generateSlug(name);
        const siblingCount = categories.filter(
          (category) =>
            (category.parentId || null) === (newCategory.parentId || null) &&
            category.id !== editingCategoryId,
        ).length;
        const data: Record<string, unknown> = {
          name,
          description: newCategory.description.trim(),
          slug,
          active: newCategory.active,
          parentId: newCategory.parentId || null,
          order: isEditingCategory
            ? (categories.find((category) => category.id === editingCategoryId)?.order ??
              siblingCount)
            : siblingCount,
          updatedAt: serverTimestamp(),
        };
        if (newCategory.image) data.image = newCategory.image;
        if (isEditingCategory && editingCategoryId) {
          await updateDoc(
            doc(db, "categories", editingCategoryId),
            data as UpdateData<DocumentData>,
          );
          toast.success("Categoria atualizada!");
        } else {
          await addDoc(collection(db, "categories"), { ...data, createdAt: serverTimestamp() });
          toast.success("Categoria criada!");
        }
        setIsAddingCategory(false);
        setIsEditingCategory(false);
        setEditingCategoryId(null);
        setNewCategory({ name: "", description: "", image: "", active: true, parentId: "" });
        await fetchData();
      } catch (err) {
        console.error("[categoria] falha ao salvar categoria:", err);
        const e = err as { code?: string; message?: string };
        const code = e.code ? ` (${e.code})` : "";
        toast.error(`${e.message || "Erro ao salvar categoria."}${code}`);
      }
    },
    [newCategory, isEditingCategory, editingCategoryId, categories, fetchData],
  );

  /**
   * Cria uma categoria minima e devolve o documento — usada pelo atalho
   * "+ Nova categoria" do formulario de produto.
   *
   * Antes esse atalho so guardava a string no produto, sem criar documento
   * nenhum: era a fabrica de produto orfao. Agora passa pelo mesmo guarda de
   * nome repetido entre irmaos e devolve o id para o produto gravar.
   */
  const createCategory = useCallback(
    async (rawName: string, parentId?: string | null): Promise<Category | null> => {
      const name = rawName.trim().toUpperCase();
      if (!name) return null;

      const conflict = findCategoryNameConflict(categories, name, parentId);
      if (conflict) {
        toast.error(
          parentId
            ? `Esta categoria já tem uma subcategoria chamada "${conflict.name}".`
            : `Já existe uma categoria principal chamada "${conflict.name}".`,
        );
        return null;
      }

      try {
        const data = {
          name,
          description: "",
          slug: generateSlug(name),
          active: true,
          parentId: parentId || null,
          order: categories.filter((c) => (c.parentId || null) === (parentId || null)).length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, "categories"), data);
        const created: Category = {
          id: ref.id,
          name,
          slug: data.slug,
          parentId: data.parentId,
          active: true,
          order: data.order,
        };
        // Entra na lista local na hora para o select ja poder selecioná-la,
        // sem esperar o fetchData.
        setCategories((prev) => [...prev, created]);
        toast.success(`Categoria "${name}" criada!`);
        return created;
      } catch (err) {
        console.error("[categoria] falha ao criar categoria rápida:", err);
        toast.error("Não foi possível criar a categoria.");
        return null;
      }
    },
    [categories, setCategories],
  );

  const handleCategoryImageUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!auth.currentUser) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
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
      setNewCategory((prev) => ({ ...prev, image: url }));
      toast.success("Capa enviada!");
    } catch (err) {
      console.error("[categoria] falha no upload da capa:", err);
      const e = err as { code?: string };
      const code = e.code ? ` (${e.code})` : "";
      toast.error(`Erro ao enviar imagem${code}.`);
    } finally {
      setIsUploadingCategoryImage(false);
    }
  }, []);

  const handleToggleCategoryActive = useCallback(
    async (id: string, current: boolean) => {
      await updateDoc(doc(db, "categories", id), {
        active: !current,
        updatedAt: serverTimestamp(),
      });
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, active: !current } : c)));
      toast.success(current ? "Categoria ocultada." : "Categoria visível.");
    },
    [setCategories],
  );

  const handleReorderCategory = useCallback(
    async (id: string, direction: "up" | "down") => {
      const current = categories.find((category) => category.id === id);
      if (!current) return;
      const parentId = current.parentId || null;
      const siblings = categories
        .filter((category) => (category.parentId || null) === parentId)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      const idx = siblings.findIndex((category) => category.id === id);
      if (idx < 0) return;
      const target =
        direction === "up" ? Math.max(0, idx - 1) : Math.min(siblings.length - 1, idx + 1);
      if (target === idx) return;
      [siblings[idx], siblings[target]] = [siblings[target], siblings[idx]];
      const updates = siblings.map((category, index) =>
        updateDoc(doc(db, "categories", category.id), {
          order: index,
          updatedAt: serverTimestamp(),
        }),
      );
      await Promise.all(updates);
      const orderById = new Map(siblings.map((category, index) => [category.id, index]));
      setCategories((previous) =>
        previous.map((category) =>
          orderById.has(category.id)
            ? { ...category, order: orderById.get(category.id) }
            : category,
        ),
      );
    },
    [categories, setCategories],
  );

  return {
    isAddingCategory,
    setIsAddingCategory,
    isEditingCategory,
    setIsEditingCategory,
    editingCategoryId,
    setEditingCategoryId,
    newCategory,
    setNewCategory,
    isUploadingCategoryImage,
    handleCategorySubmit,
    createCategory,
    handleCategoryImageUpload,
    handleToggleCategoryActive,
    handleReorderCategory,
  };
}
