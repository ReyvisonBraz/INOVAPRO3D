import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_MACHINE,
  DEFAULT_PRICING_SETTINGS,
  type MachineConfig,
  type PricingSettings,
} from "../../../lib/pricing";
import {
  fetchAdminSettings,
  saveGlobalSettings,
  saveMachineSettings,
  savePricingSettings,
} from "../../../services/adminSettings";
import type { GlobalSettings } from "../../../types/domain";

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  promoBanner: "Frete Grátis em pedidos acima de R$ 250",
  minOrderValue: 50,
  maintenanceMode: false,
};

export function useAdminSettings() {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [machineConfig, setMachineConfig] = useState<MachineConfig>(DEFAULT_MACHINE);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);

  useEffect(() => {
    fetchAdminSettings()
      .then((settings) => {
        if (settings.globalSettings) setGlobalSettings(settings.globalSettings);
        if (settings.machineConfig) setMachineConfig(settings.machineConfig);
        if (settings.pricingSettings) setPricingSettings(settings.pricingSettings);
      })
      .catch((error) => console.error("Error fetching settings:", error));
  }, []);

  const handleSaveGlobalSettings = useCallback(async () => {
    try {
      await saveGlobalSettings(globalSettings);
      toast.success("Configurações globais atualizadas!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    }
  }, [globalSettings]);

  const handleSaveMachineConfig = useCallback(async () => {
    try {
      await saveMachineSettings(machineConfig);
      toast.success("Config da máquina salva!");
    } catch {
      toast.error("Erro ao salvar config da máquina.");
    }
  }, [machineConfig]);

  const handleSavePricingSettings = useCallback(async () => {
    try {
      await savePricingSettings(pricingSettings);
      toast.success(
        "Parâmetros da calculadora salvos! As duas calculadoras já usam estes valores.",
      );
    } catch {
      toast.error("Erro ao salvar parâmetros da calculadora.");
    }
  }, [pricingSettings]);

  const toggleMaintenance = useCallback(() => {
    setGlobalSettings((settings) => ({
      ...settings,
      maintenanceMode: !settings.maintenanceMode,
    }));
  }, []);

  return {
    globalSettings,
    setGlobalSettings,
    machineConfig,
    setMachineConfig,
    pricingSettings,
    setPricingSettings,
    handleSaveGlobalSettings,
    handleSaveMachineConfig,
    handleSavePricingSettings,
    toggleMaintenance,
  };
}
