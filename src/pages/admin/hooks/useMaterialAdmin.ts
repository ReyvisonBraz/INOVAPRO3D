import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  adjustMaterialStock,
  createMaterial,
  type MaterialDraft,
} from "../../../services/inventory";
import { handleFirestoreError, OperationType } from "../../../services/firebase";
import type { Material } from "../../../types/domain";

const emptyMaterial = (): MaterialDraft => ({
  name: "",
  type: "PLA",
  color: "#2563EB",
  pricePerKg: 120,
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

interface UseMaterialAdminOptions {
  fetchData: () => void | Promise<void>;
}

export function useMaterialAdmin({ fetchData }: UseMaterialAdminOptions) {
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState<MaterialDraft>(emptyMaterial);

  const openMaterialForm = useCallback(() => {
    setNewMaterial(emptyMaterial());
    setIsAddingMaterial(true);
  }, []);

  const closeMaterialForm = useCallback(() => setIsAddingMaterial(false), []);

  const handleMaterialSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (isSubmittingMaterial) return;
      setIsSubmittingMaterial(true);
      try {
        await createMaterial(newMaterial);
        toast.success("Material adicionado!");
        setIsAddingMaterial(false);
        await fetchData();
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "materials");
      } finally {
        setIsSubmittingMaterial(false);
      }
    },
    [fetchData, isSubmittingMaterial, newMaterial],
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
    newMaterial,
    setNewMaterial,
    openMaterialForm,
    closeMaterialForm,
    handleMaterialSubmit,
    handleAdjustMaterialStock,
  };
}
