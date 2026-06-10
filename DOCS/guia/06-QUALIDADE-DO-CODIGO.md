# 06 — Qualidade do Código: O que está bom e o que refatorar

## Primeiro: o que é "refatorar"?

Refatorar é **reorganizar o código sem mudar o que ele faz** — como arrumar uma
oficina bagunçada: as ferramentas são as mesmas, mas tudo fica mais fácil de achar,
usar e consertar. Código refatorado = menos bugs novos e mudanças mais rápidas.

## Nota geral do projeto: 7/10 🎯

O projeto é **funcional, organizado nas pastas certas e bem tipado**. Os problemas
são de *crescimento*: alguns arquivos viraram gigantes e há padrões copiados e
colados que deveriam ser peças reutilizáveis.

## ✅ O que está BEM feito (parabéns!)

1. **Estrutura de pastas profissional** — `pages/`, `components/`, `contexts/`,
   `services/`, `lib/`, `types/` é exatamente o padrão de mercado
2. **TypeScript em tudo** — só 4 usos de `any` (a "trapaça" que desliga a verificação)
   em ~14 mil linhas. Excelente
3. **Tipos de domínio centralizados** — `types/domain.ts` define todos os contratos
4. **Zero código morto, zero TODOs esquecidos, zero console.log perdido**
5. **Painéis do admin separados em 18 componentes** — boa componentização
6. **Motor de preços isolado** — `lib/pricing.ts` é a única fonte da matemática
7. **ErrorBoundary, lazy loading de rotas, estados de carregamento** presentes

## 🔴 Os 3 maiores problemas

### Problema 1: O "componente Deus" — AdminDashboard.tsx (1.764 linhas)

Um arquivo de React saudável tem 100–300 linhas e **uma** responsabilidade.
O AdminDashboard tem **12 responsabilidades**, **77 estados** (`useState`) e
**27 funções de manipulação**. É como uma sala onde uma pessoa só atende
telefone, faz contabilidade, cozinha e conserta o encanamento.

**Sintoma prático:** o painel "Visão Geral" recebe **22 props** do pai
(isso se chama *prop drilling* — passar dados de mão em mão por camadas).

**A solução — extrair "custom hooks":** um custom hook é uma gaveta que agrupa
estado + lógica de um assunto. O plano:

```
AdminDashboard.tsx (1.764 linhas)
        ↓ vira ↓
AdminDashboard.tsx (~400 linhas, só orquestra)
 ├── hooks/useOrders.ts       ← pedidos: buscar, atualizar status, excluir
 ├── hooks/useProducts.ts     ← produtos: CRUD, importação, imagens
 ├── hooks/useQuotes.ts       ← orçamentos + WhatsApp
 ├── hooks/useCategories.ts   ← pastas: CRUD, reordenar, capa
 └── hooks/useQuickCalc.ts    ← calculadora rápida (20+ estados!)
```

### Problema 2: FilamentCalculator.tsx (1.396 linhas)

Mesmo diagnóstico: um formulário gigante num arquivo só. Dividir em seções:
`<SeletorMaterial>`, `<EntradaPesoTempo>`, `<ConfigMaquina>`, `<Resultados>`.

### Problema 3: Copiar e colar (duplicação)

| Padrão duplicado | Quantas vezes | Solução |
|---|---|---|
| `try { ... } catch { toast.error(...) }` | **78×** | Um hook `useAsyncComToast()` que embrulha qualquer operação |
| Busca no Firestore (`getDocs(query(...))`) | **18×** | Um hook `useFirestoreCollection()` |
| Classes Tailwind de "card de vidro" | **53×** | Um componente `<GlassCard>` |
| `fetchSettings()` no Checkout | **2× no mesmo arquivo!** | Apagar uma e reaproveitar |

**Por que duplicação é ruim?** Quando você precisar mudar o estilo do card,
terá que mudar em 53 lugares — e vai esquecer alguns.

## 🟡 Problemas menores

- **`(o as any)._deleted`** no AdminDashboard — gambiarra de tipo; adicionar
  o campo `_deleted?: boolean` na interface `Order`/`Quote` resolve
- **Datas do Firestore** acessadas com `as any` — criar um helper `toDate()`
- **Sem ESLint** — o projeto só tem o verificador do TypeScript. ESLint pegaria
  mais categorias de erro automaticamente

## ❌ A maior lacuna: ZERO testes automatizados

O projeto não tem **nenhum teste**. Testes são programas que verificam seu
programa — ex: *"se calcular 100g de PLA por 3h, o preço dá R$ X?"*.

Para um e-commerce (dinheiro real, estoque real), os primeiros testes deveriam cobrir:
1. **`lib/pricing.ts`** — a matemática de preços (mais fácil de testar e mais crítica)
2. **CartContext** — adicionar/remover/somar do carrinho
3. **Fluxo de checkout** — criação correta do pedido

## Plano de refatoração recomendado (em fases)

### Fase 1 — Vitórias rápidas (poucas horas)
- [ ] Apagar `fetchSettings()` duplicado no Checkout
- [ ] Trocar os 4 `as any` por tipos corretos
- [ ] Criar `<GlassCard>` e usar nos lugares novos daqui pra frente

### Fase 2 — Quebrar os gigantes (1–2 semanas)
- [ ] Extrair os 5 hooks do AdminDashboard (maior impacto do projeto!)
- [ ] Dividir o FilamentCalculator em 4–5 seções
- [ ] Criar `useFirestoreCollection()` e migrar as buscas aos poucos

### Fase 3 — Profissionalizar (contínuo)
- [ ] Configurar ESLint + Prettier
- [ ] Testes do `pricing.ts` e do carrinho (Vitest)
- [ ] Biblioteca de componentes de formulário (`<Input>`, `<Select>`...)

> 💡 **Regra de ouro para as próximas features:** antes de criar tela nova,
> pergunte "já existe um componente/hook pra isso?". O custo de duplicar é
> invisível hoje e enorme daqui a 6 meses.
