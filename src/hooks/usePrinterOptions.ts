import { useCallback, useEffect, useState } from "react";
import { fetchLegacyMachineConfig, fetchPrinters } from "../services/printers";
import { pickDefaultPrinter } from "../lib/printers";
import { DEFAULT_MACHINE, type MachineConfig } from "../lib/pricing";
import type { Printer } from "../types/domain";

export interface PrinterOptions {
  printers: Printer[];
  /** Impressora sugerida quando o orçamento ainda não escolheu nenhuma. */
  defaultPrinter: Printer | null;
  /**
   * Máquina usada quando não há nenhuma impressora cadastrada: o antigo
   * `settings/machine` ou, na falta dele, o padrão do código.
   */
  legacyMachine: MachineConfig;
  loading: boolean;
  /** Verdadeiro quando a leitura falhou (regras não publicadas, offline). */
  unavailable: boolean;
  reload: () => Promise<void>;
}

interface LoadedOptions {
  printers: Printer[] | null;
  legacyMachine: MachineConfig | null;
}

/** Busca as duas origens em paralelo sem nunca rejeitar. */
async function loadPrinterOptions(): Promise<LoadedOptions> {
  const [printers, legacyMachine] = await Promise.all([
    fetchPrinters().catch(() => null),
    fetchLegacyMachineConfig().catch(() => null),
  ]);
  return { printers, legacyMachine };
}

/**
 * Cascata de origem da máquina para as calculadoras:
 * `printers` → `settings/machine` → `DEFAULT_MACHINE`.
 *
 * Nunca lança: se a coleção estiver bloqueada ou vazia, a calculadora
 * continua funcionando com a configuração antiga.
 */
export function usePrinterOptions(): PrinterOptions {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [legacyMachine, setLegacyMachine] = useState<MachineConfig>(DEFAULT_MACHINE);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const apply = useCallback((loaded: LoadedOptions) => {
    setPrinters(loaded.printers ?? []);
    setUnavailable(loaded.printers === null);
    if (loaded.legacyMachine) setLegacyMachine(loaded.legacyMachine);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadPrinterOptions().then((loaded) => {
      if (!cancelled) apply(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const reload = useCallback(async () => {
    apply(await loadPrinterOptions());
  }, [apply]);

  return {
    printers,
    defaultPrinter: pickDefaultPrinter(printers),
    legacyMachine,
    loading,
    unavailable,
    reload,
  };
}
