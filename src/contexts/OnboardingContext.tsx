import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

/**
 * Orquestração dos avisos de onboarding: garante NO MÁXIMO UM por vez, em ordem.
 *
 * Fluxo: welcome → cookies → install → done.
 *
 * Cada aviso (WelcomeGate, CookieConsent, InstallGate) renderiza somente quando
 * é o passo ativo E suas próprias condições batem; caso contrário, chama
 * `advance()` para pular. O push NÃO participa deste fluxo — virou on-demand no
 * sino do cabeçalho.
 */
export type OnboardingStep = "welcome" | "cookies" | "install" | "done";

const ORDER: OnboardingStep[] = ["welcome", "cookies", "install", "done"];

interface OnboardingValue {
  activeStep: OnboardingStep;
  /** Avança para o próximo passo do fluxo (idempotente em "done"). */
  advance: () => void;
}

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [activeStep, setActiveStep] = useState<OnboardingStep>("welcome");

  const advance = useCallback(() => {
    setActiveStep((prev) => {
      const i = ORDER.indexOf(prev);
      return ORDER[Math.min(i + 1, ORDER.length - 1)];
    });
  }, []);

  return (
    <OnboardingContext.Provider value={{ activeStep, advance }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding precisa estar dentro de OnboardingProvider");
  return ctx;
}
