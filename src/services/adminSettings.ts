import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { mergePricingSettings, type MachineConfig, type PricingSettings } from "../lib/pricing";
import type { GlobalSettings } from "../types/domain";
import { db } from "./firebase";

export interface AdminSettingsSnapshot {
  globalSettings: GlobalSettings | null;
  machineConfig: MachineConfig | null;
  pricingSettings: PricingSettings | null;
}

export async function fetchAdminSettings(): Promise<AdminSettingsSnapshot> {
  const [globalSnapshot, machineSnapshot, pricingSnapshot] = await Promise.all([
    getDoc(doc(db, "settings", "global")),
    getDoc(doc(db, "settings", "machine")),
    getDoc(doc(db, "settings", "pricing")),
  ]);

  return {
    globalSettings: globalSnapshot.exists() ? (globalSnapshot.data() as GlobalSettings) : null,
    machineConfig: machineSnapshot.exists() ? (machineSnapshot.data() as MachineConfig) : null,
    pricingSettings: pricingSnapshot.exists() ? mergePricingSettings(pricingSnapshot.data()) : null,
  };
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<void> {
  await setDoc(doc(db, "settings", "global"), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

export async function saveMachineSettings(settings: MachineConfig): Promise<void> {
  await setDoc(doc(db, "settings", "machine"), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

export async function savePricingSettings(settings: PricingSettings): Promise<void> {
  const updatedAt = serverTimestamp();
  await Promise.all([
    setDoc(doc(db, "settings", "pricing"), { ...settings, updatedAt }),
    setDoc(doc(db, "settings", "storefront"), {
      pixDiscountPct: settings.pixDiscountPct,
      maxInstallments: settings.maxInstallments,
      updatedAt,
    }),
  ]);
}
