// ============================================================================
// AGRUPAMENTO DE MODELOS POR PRODUTO
// ----------------------------------------------------------------------------
// Um "Modelo" salvo já guarda o projeto inteiro (bandejas, tempos, gramas,
// outputQuantity — ver calculatorTemplates.ts). O que faltava era juntar
// variantes de quantidade do MESMO produto (ex.: "Quadro Geométrico" em 1 e em
// 5 peças) num único cartão, em vez de cada quantidade virar um modelo solto
// e sem relação visual com as demais.
//
// `productKey` é opcional e só existe quando o usuário explicitamente vincula
// uma nova quantidade a um produto (ver useCalculatorState.ts). Modelos sem
// `productKey` — todo o histórico já salvo, e a maioria dos modelos novos que
// nunca precisarão de uma segunda quantidade — viram grupos de 1, com
// aparência idêntica à de antes deste agrupamento existir.
// ============================================================================

import type { CalculatorTemplate, FirestoreDate } from "../types/domain";

export interface TemplateGroup {
  /** Representa a família no cartão: nome, imagem e descrição vêm daqui. */
  anchor: CalculatorTemplate;
  /** Todas as variantes do grupo, incluindo a âncora, ordenadas por quantidade. */
  variants: CalculatorTemplate[];
}

function seconds(value: FirestoreDate | undefined): number {
  if (!value) return 0;
  return "seconds" in value ? value.seconds : 0;
}

/**
 * Ordena por quantidade crescente; empate por mais antigo primeiro — a
 * variante que fixa o "início" da família aparece primeiro nos chips.
 */
function compareVariants(a: CalculatorTemplate, b: CalculatorTemplate): number {
  const quantityDiff = (a.quantityValue ?? 0) - (b.quantityValue ?? 0);
  if (quantityDiff !== 0) return quantityDiff;
  return seconds(a.createdAt) - seconds(b.createdAt);
}

/**
 * Agrupa por `productKey`. Modelos sem a chave nunca se misturam entre si —
 * cada um vira seu próprio grupo de 1 variante, preservando o comportamento
 * anterior ao agrupamento para todo o histórico já salvo.
 *
 * A entrada já chega ordenada por uso (`usageCount` desc) — o grupo de uma
 * família precisa aparecer na posição da SUA primeira variante encontrada,
 * não jogado para o fim da lista, senão um produto muito usado "afunda" só
 * por ter ganhado uma segunda quantidade.
 */
export function groupTemplatesByProduct(templates: CalculatorTemplate[]): TemplateGroup[] {
  const variantsByKey = new Map<string, CalculatorTemplate[]>();
  const order: string[] = [];

  for (const template of templates) {
    const key = template.productKey ?? `__single:${template.id}`;
    const existing = variantsByKey.get(key);
    if (existing) {
      existing.push(template);
    } else {
      variantsByKey.set(key, [template]);
      order.push(key);
    }
  }

  return order.map((key) => {
    const sorted = [...variantsByKey.get(key)!].sort(compareVariants);
    return { anchor: sorted[0], variants: sorted };
  });
}
