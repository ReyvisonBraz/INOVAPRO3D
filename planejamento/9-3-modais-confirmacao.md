# Plano de Ação: Substituição de Diálogos Nativos por Modais Customizados

Este plano visa garantir a consistência de design da marca Inovalt 3D eliminando os alertas e confirmações genéricas do navegador (`window.confirm()` e `window.alert()`).

---

## 🎯 Escopo Geral

Garantir que todas as interações de alto risco (exclusões ou cancelamentos) ou estruturais (aprovação de pedidos) possuam confirmações representadas por gavetas ou modais pretos translúcidos elegantes, com botões bem sinalizados.

## 📝 Pontos de Implementação

1. **Substituição Completa de `window.confirm()`**:
   * Substituir chamadas de confirmação nativa de navegadores nas seguintes operações dentro do Admin:
     - Exclusão de orçamentos ou pedidos.
     - Operações de redefinição de estoque de produtos.
     - Alterações críticas de permissão técnica.

2. **Design e Micro-Interações**:
   * Utilizar Backdrop focado com blur de vidro fosco (`backdrop-blur-md bg-black/40`).
   * Adicionar transições suaves de entrada e saída por meio do `framer-motion` (escalonamento suave `scale-95` para `scale-100`).

3. **Código Semântico para Modais de Confirmação**:
   * Criar um sub-componente reutilizável `ConfirmDialog` que recebe:
     - Título e Descrição de Alerta.
     - Tipo de ação (Destrutiva/Perigosa em vermelho, Ação Positiva ou Faturamento em verde).
     - Callback associado (`onConfirm` e `onCancel`).
