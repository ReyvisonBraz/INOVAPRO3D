# Plano de Ação: Histórico de Alterações e Auditoria (Timeline)

Este plano visa estruturar a rastreabilidade e histórico de eventos internos dentro de orçamentos e pedidos, permitindo entender o andamento das conversas, negociações e alterações de parâmetros operacionais.

---

## 🎯 Escopo Geral

Registrar os principais eventos que alteraram propriedades críticas do orçamento (preço, peso, tempo de produção, comentários internos ou status geral), desenhando uma timeline minimalista de fácil leitura no rodapé do painel detalhado.

## 📝 Pontos de Implementação

1. **Alteração na Estrutura Firestore da Coleção `quotes`**:
   * Introduzir um array de eventos de histórico formatado como `historyLogs`:
     ```json
     [
       {
         "timestamp": "ISO-Date",
         "action": "Ação específica realizada",
         "author": "E-mail ou ID do Admin que operou a alteração",
         "details": "Representação de texto descrevendo o delta (ex: Preço alterado de R$10 para R$25)"
       }
     ]
     ```

2. **Geração Automática de Logs em Rotinas Críticas**:
   * Sempre que o administrador disparar `handleSaveQuoteSpecifications` ou converter orçamentos, injetar por padrão uma entrada nova no array de registro auditável sem sobreescrever o histórico existente (utilizando o operador atomic do Firebase `arrayUnion`).

3. **Painel de Timeline Visualmente Atraente**:
   * Exibir uma trilha vertical impecável com micro-pontos indicadores, ícones indicativos elegantes e as datas/horários convertidos para a hora local simplificada do Brasil.
