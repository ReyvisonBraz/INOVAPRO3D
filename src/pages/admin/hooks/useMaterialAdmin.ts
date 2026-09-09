import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  adjustMaterialStock,
  createMaterial,
  updateMaterial,
  type MaterialDraft,
} from "../../../services/inventory";
import { handleFirestoreError, OperationType } from "../../../services/firebase";
import type { Material } from "../../../types/domain";

// O custo nasce zerado de propósito. Um default plausível (era R$120/kg) some
// no formulário e vira preço real no orçamento — melhor exigir o número.
const emptyMaterial = (): MaterialDraft => ({
  name: "",
  type: "PLA",
  color: "#2563EB",
  pricePerKg: 0,
  stockGrams: 0,
  reservedGrams: 0,
  minimumStockGrams: 200,
  brand: "",
  supplier: "",
  batch: "",
  location: "",
  notes: "",
  inStock: false,
  active: true,
});

const draftFromMaterial = (material: Material): MaterialDraft => ({
  name: material.name ?? "",
  type: material.type ?? "PLA",
  color: material.color || "#2563EB",
  pricePerKg: Number(material.pricePerKg ?? 0),
  stockGrams: Number(material.stockGrams ?? 0),
  reservedGrams: Number(material.reservedGrams ?? 0),
  minimumStockGrams: Number(material.minimumStockGrams ?? 0),
  brand: material.brand ?? "",
  supplier: material.supplier ?? "",
  batch: material.batch ?? "",
  location: material.location ?? "",
  notes: material.notes ?? "",
  inStock: material.inStock === true,
  active: material.active !== false,
});

interface UseMaterialAdminOptions {
  fetchData: () => void | Promise<void>;
}

export function useMaterialAdmin({ fetchData }: UseMaterialAdminOptions) {
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<MaterialDraft>(emptyMaterial);

  const openMaterialForm = useCallback(() => {
    setEditingMaterialId(null);
    setNewMaterial(emptyMaterial());
    setIsAddingMaterial(true);
  }, []);

  const openMaterialEditor = useCallback((material: Material) => {
    setEditingMaterialId(material.id);
    setNewMaterial(draftFromMaterial(material));
    setIsAddingMaterial(true);
  }, []);

  const closeMaterialForm = useCallback(() => {
    setIsAddingMaterial(false);
    setEditingMaterialId(null);
  }, []);

  const handleMaterialSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (isSubmittingMaterial) return;
      if (!(Number(newMaterial.pricePerKg) > 0)) {
        toast.error("Informe o custo por kg — ele entra direto no cálculo do orçamento.");
        return;
      }
      setIsSubmittingMaterial(true);
      try {
        if (editingMaterialId) {
          // Saldo e reserva não vão no patch: quem move estoque é a ação
          // "Movimentar", que registra a movimentação no livro-razão.
          await updateMaterial(editingMaterialId, {
            name: newMaterial.name,
            type: newMaterial.type,
            color: newMaterial.color,
            pricePerKg: newMaterial.pricePerKg,
            minimumStockGrams: newMaterial.minimumStockGrams,
            brand: newMaterial.brand,
            supplier: newMaterial.supplier,
            batch: newMaterial.batch,
            location: newMaterial.location,
            notes: newMaterial.notes,
            active: newMaterial.active,
          });
          toast.success("Material atualizado!");
        } else {
          await createMaterial(newMaterial);
          toast.success("Material adicionado!");
        }
        setIsAddingMaterial(false);
        setEditingMaterialId(null);
        await fetchData();
      } catch (error) {
        handleFirestoreError(
          error,
          editingMaterialId ? OperationType.UPDATE : OperationType.CREATE,
          "materials",
        );
      } finally {
        setIsSubmittingMaterial(false);
      }
    },
    [editingMaterialId, fetchData, isSubmittingMaterial, newMaterial],
  );

  const handleAdjustMaterialStock = useCallback(
    async (material: Material) => {
      const raw = window.prompt(
        `Ajuste de ${material.name} em gramas. Use negativo para saida:`,
        "1000",
      );
      if (raw === null) return;
      const amount = Number(raw.replace(",", "."));
      const reason =
        window.prompt(
          "Motivo da movimentacao:",
          amount > 0 ? "Entrada de filamento" : "Ajuste de inventario",
        ) ?? "Ajuste manual";
      try {
        await adjustMaterialStock(material.id, amount, reason);
        toast.success("Estoque atualizado com historico.");
        await fetchData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao ajustar estoque.");
      }
    },
    [fetchData],
  );

  return {
    isAddingMaterial,
    isSubmittingMaterial,
    editingMaterialId,
    newMaterial,
    setNewMaterial,
    openMaterialForm,
    openMaterialEditor,
    closeMaterialForm,
    handleMaterialSubmit,
    handleAdjustMaterialStock,
  };
}
