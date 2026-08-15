import type { Quote } from "../../types/domain";
import type { CalculatorIntent } from "../public/calculator/useCalculatorState";

export const ADMIN_CALCULATOR_OPEN_EVENT = "inovapro3d:admin-calculator-open";

export interface AdminCalculatorOpenRequest {
  mode: CalculatorIntent;
  quote?: Quote;
}

/** Entrada única para abrir a calculadora embutida, com ou sem orçamento. */
export function openAdminCalculator(request: AdminCalculatorOpenRequest = { mode: "NEW" }) {
  window.dispatchEvent(
    new CustomEvent<AdminCalculatorOpenRequest>(ADMIN_CALCULATOR_OPEN_EVENT, {
      detail: request,
    }),
  );
}
