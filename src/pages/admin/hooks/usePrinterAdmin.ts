import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { auth, getStorageInstance } from "../../../services/firebase";
import {
  createPrinter,
  deletePrinter,
  isPermissionDenied,
  mirrorDefaultPrinterToSettings,
  RULES_NOT_DEPLOYED_MESSAGE,
  seedPrintersIfEmpty,
  setDefaultPrinter,
  updatePrinter,
  type PrinterDraft,
} from "../../../services/printers";
import { pickDefaultPrinter } from "../../../lib/printers";
import { fileToWebpBlob } from "../../../lib/adminHelpers";
import { DEFAULT_MACHINE, type MachineConfig } from "../../../lib/pricing";
import type { Printer } from "../../../types/domain";

/** Estado do formulário: os 9 campos de custo mais a identidade da máquina. */
export interface PrinterFormState extends MachineConfig {
  name: string;
  model: string;
  photoUrl: string;
  defaultSteadyPowerWatts: number | null;
  startupPowerWatts: number | null;
  startupMinutes: number | null;
  notes: string;
  active: boolean;
  isDefault: boolean;
}

export const emptyPrinterForm = (): PrinterFormState => ({
  ...DEFAULT_MACHINE,
  name: "",
  model: "",
  photoUrl: "",
  defaultSteadyPowerWatts: null,
  startupPowerWatts: null,
  startupMinutes: null,
  notes: "",
  active: true,
  isDefault: false,
});

const formFromPrinter = (printer: Printer): PrinterFormState => ({
  price: printer.price,
  lifespanHours: printer.lifespanHours,
  nozzlePrice: printer.nozzlePrice,
  nozzleLifeHours: printer.nozzleLifeHours,
  platePrice: printer.platePrice,
  plateLifeHours: printer.plateLifeHours,
  beltsPrice: printer.beltsPrice,
  beltsLifeHours: printer.beltsLifeHours,
  maintPerHour: printer.maintPerHour,
  name: printer.name,
  model: printer.model ?? "",
  photoUrl: printer.photoUrl ?? "",
  defaultSteadyPowerWatts: printer.defaultSteadyPowerWatts ?? null,
  startupPowerWatts: printer.startupPowerWatts ?? null,
  startupMinutes: printer.startupMinutes ?? null,
  notes: printer.notes ?? "",
  active: printer.active !== false,
  isDefault: printer.isDefault === true,
});

const draftFromForm = (form: PrinterFormState, order: number): PrinterDraft => ({
  price: form.price,
  lifespanHours: form.lifespanHours,
  nozzlePrice: form.nozzlePrice,
  nozzleLifeHours: form.nozzleLifeHours,
  platePrice: form.platePrice,
  plateLifeHours: form.plateLifeHours,
  beltsPrice: form.beltsPrice,
  beltsLifeHours: form.beltsLifeHours,
  maintPerHour: form.maintPerHour,
  name: form.name.trim(),
  model: form.model.trim() || undefined,
  photoUrl: form.photoUrl.trim() || undefined,
  defaultSteadyPowerWatts: form.defaultSteadyPowerWatts ?? undefined,
  startupPowerWatts: form.startupPowerWatts ?? undefined,
  startupMinutes: form.startupMinutes ?? undefined,
  notes: form.notes.trim() || undefined,
  active: form.active,
  isDefault: form.isDefault,
  order,
});

interface Deps {
  printers: Printer[];
  printersBlocked: boolean;
  fetchData: () => Promise<void>;
  /** Máquina atual do painel, usada para semear a primeira impressora. */
  machineConfig?: MachineConfig;
}

/** Estado e ações do cadastro de impressoras. */
export function usePrinterAdmin({ printers, printersBlocked, fetchData, machineConfig }: Deps) {
  const [isPrinterFormOpen, setIsPrinterFormOpen] = useState(false);
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  const [printerForm, setPrinterForm] = useState<PrinterFormState>(emptyPrinterForm);
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);
  const [isUploadingPrinterPhoto, setIsUploadingPrinterPhoto] = useState(false);
  const seedAttempted = useRef(false);

  // Migração silenciosa: a primeira visita com a coleção vazia transforma o
  // antigo `settings/machine` na impressora padrão, sem o admin fazer nada.
  useEffect(() => {
    if (seedAttempted.current || printersBlocked || printers.length) return;
    seedAttempted.current = true;
    seedPrintersIfEmpty(machineConfig ?? DEFAULT_MACHINE)
      .then((createdId) => {
        if (createdId) return fetchData();
      })
      .catch((err) => {
        if (isPermissionDenied(err)) return;
        console.error("[impressoras] falha ao semear a impressora inicial:", err);
      });
  }, [printers.length, printersBlocked, machineConfig, fetchData]);

  const openNewPrinter = useCallback(() => {
    setEditingPrinterId(null);
    setPrinterForm({ ...emptyPrinterForm(), isDefault: false });
    setIsPrinterFormOpen(true);
  }, []);

  const openEditPrinter = useCallback((printer: Printer) => {
    setEditingPrinterId(printer.id);
    setPrinterForm(formFromPrinter(printer));
    setIsPrinterFormOpen(true);
  }, []);

  const closePrinterForm = useCallback(() => {
    setIsPrinterFormOpen(false);
    setEditingPrinterId(null);
  }, []);

  const handlePrinterSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!printerForm.name.trim()) {
        toast.error("Dê um nome para a impressora.");
        return;
      }
      setIsSavingPrinter(true);
      try {
        const existing = editingPrinterId
          ? printers.find((printer) => printer.id === editingPrinterId)
          : undefined;
        const order = existing?.order ?? printers.length;
        // A primeira impressora cadastrada assume o papel de padrão.
        const shouldBeDefault = printerForm.isDefault || printers.length === 0;
        const draft = draftFromForm({ ...printerForm, isDefault: shouldBeDefault }, order);

        let printerId = editingPrinterId;
        if (printerId) {
          await updatePrinter(printerId, draft);
        } else {
          printerId = await createPrinter(draft);
        }

        if (shouldBeDefault) {
          const siblings = printers
            .filter((printer) => printer.id !== printerId)
            .map((printer) => ({ id: printer.id, isDefault: printer.isDefault }));
          await setDefaultPrinter([...siblings, { id: printerId, isDefault: true }], printerId);
          await mirrorDefaultPrinterToSettings({ ...draft, id: printerId });
        }

        toast.success(editingPrinterId ? "Impressora atualizada!" : "Impressora cadastrada!");
        closePrinterForm();
        await fetchData();
      } catch (err) {
        console.error("[impressoras] falha ao salvar:", err);
        toast.error(
          isPermissionDenied(err) ? RULES_NOT_DEPLOYED_MESSAGE : "Erro ao salvar a impressora.",
          isPermissionDenied(err) ? { duration: 6000 } : undefined,
        );
      } finally {
        setIsSavingPrinter(false);
      }
    },
    [printerForm, editingPrinterId, printers, closePrinterForm, fetchData],
  );

  const handlePrinterPhotoUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!auth.currentUser) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    // A regra do Storage exige < 10 MB. Barramos antes, com margem, para dar
    // um erro claro em vez de um "permission denied" genérico.
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande. Use uma de até 8 MB.");
      return;
    }
    setIsUploadingPrinterPhoto(true);
    try {
      const image = await fileToWebpBlob(file);
      const path = `printers/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
      const fileRef = storageRef(await getStorageInstance(), path);
      await uploadBytes(fileRef, image, { contentType: "image/webp" });
      const url = await getDownloadURL(fileRef);
      setPrinterForm((previous) => ({ ...previous, photoUrl: url }));
      toast.success("Foto enviada!");
    } catch (err) {
      console.error("[impressoras] falha no upload da foto:", err);
      const code = (err as { code?: string })?.code || "";
      toast.error(
        code === "storage/unauthorized"
          ? "Upload bloqueado: publique as regras do Storage (firebase deploy --only storage)."
          : "Erro ao enviar a foto.",
        code === "storage/unauthorized" ? { duration: 6000 } : undefined,
      );
    } finally {
      setIsUploadingPrinterPhoto(false);
    }
  }, []);

  const handleSetDefaultPrinter = useCallback(
    async (id: string) => {
      const target = printers.find((printer) => printer.id === id);
      if (!target) return;
      try {
        await setDefaultPrinter(printers, id);
        await mirrorDefaultPrinterToSettings(target);
        toast.success(`${target.name} agora é a impressora padrão.`);
        await fetchData();
      } catch (err) {
        console.error("[impressoras] falha ao definir padrão:", err);
        toast.error("Erro ao definir a impressora padrão.");
      }
    },
    [printers, fetchData],
  );

  const handleTogglePrinterActive = useCallback(
    async (id: string, current: boolean) => {
      try {
        await updatePrinter(id, { active: !current });
        toast.success(current ? "Impressora desativada." : "Impressora ativada.");
        await fetchData();
      } catch (err) {
        console.error("[impressoras] falha ao alternar status:", err);
        toast.error("Erro ao alterar o status da impressora.");
      }
    },
    [fetchData],
  );

  const handleDeletePrinter = useCallback(
    async (id: string) => {
      const remaining = printers.filter((printer) => printer.id !== id);
      try {
        await deletePrinter(id);
        // Sem padrão, `settings/machine` ficaria apontando para uma máquina que
        // não existe mais: promovemos a próxima e reespelhamos.
        const promoted = pickDefaultPrinter(remaining);
        if (promoted && !remaining.some((printer) => printer.isDefault)) {
          await setDefaultPrinter(remaining, promoted.id);
          await mirrorDefaultPrinterToSettings(promoted);
        }
        toast.success("Impressora excluída.");
        await fetchData();
      } catch (err) {
        console.error("[impressoras] falha ao excluir:", err);
        toast.error("Erro ao excluir a impressora.");
      }
    },
    [printers, fetchData],
  );

  return {
    isPrinterFormOpen,
    editingPrinterId,
    printerForm,
    setPrinterForm,
    isSavingPrinter,
    isUploadingPrinterPhoto,
    openNewPrinter,
    openEditPrinter,
    closePrinterForm,
    handlePrinterSubmit,
    handlePrinterPhotoUpload,
    handleSetDefaultPrinter,
    handleTogglePrinterActive,
    handleDeletePrinter,
  };
}
