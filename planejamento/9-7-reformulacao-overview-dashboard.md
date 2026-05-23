# Plano de Ação: Reformulação do Painel Inicial e Indicadores do Dashboard (Overview)

Este plano analisa a primeira função do painel administrativo (aba **Overview** / Dashboard Geral), mapeia as regras de negócio em funcionamento, aponta as ausências operacionais reclamadas, e estabelece um passo a passo rigoroso para melhorias futuras sem deixar funcionalidades inacabadas.

---

## 🎯 1. Diagnóstico do Estado Atual (O que já funciona?)

Atualmente, na aba inicial (Tab `overview` do `AdminDashboard.tsx`), o sistema realiza operações estáticas de agregação e listagem rápida:

*   **Resumo Financeiro Simples (Receita Acumulada)**: Consolida a soma do valor total de pedidos faturados com um `.reduce` rudimentar.
*   **Métricas Gerais**: Quadros mostrando a quantidade total de pedidos ativos ("Em Produção") e de orçamentos pendentes.
*   **Grid de Atividades Recentes (Bento Layout)**: 
    *   **Últimos Pedidos**: Tabela listando os quatro pedidos mais recentes com protocolo e valor.
    *   **Últimos Orçamentos**: Tabela com os quatro orçamentos que aguardam revisão do administrador.
*   **Controles de Barra Superior**: Busca global por texto e botão para forçar re-sincronização de dados do Firestore.

---

## ⚠️ 2. Lacunas Identificadas e Oportunidades (O que falta/esquecemos?)

Analisando o fluxo de uso real, foram identificadas as seguintes ausências e pontos frágeis:

1.  **Ausência de Esteira Logística Visual (Kanban)**:
    *   *Problema*: O Kanban de acompanhamento operacional não é exibido diretamente ao acessar a tela inicial do painel administrativo. O administrador é obrigado a navegar em abas internas para gerenciar o andamento.
2.  **Ausência de Detalhamento no Cálculo Automático**:
    *   *Problema*: O dashboard mostra o montante financeiro consolidado, mas não oferece um demonstrativo de custos aberto (custo do material líquido, depreciação da máquina por hora, taxa de risco, setup e faturamento de fatiamento) diretamente na home. Não há uma ferramenta rápida para simulações pontuais sem cadastrar um orçamento inteiro.
3.  **Falta do Gatilho WhatsApp para Envio Rápido**:
    *   *Problema*: Não existe integração nativa na home para disparar orçamentos avulsos ou de forma rápida por WhatsApp Web sem que o cliente já tenha um fluxo cadastrado passo a passo no CRM.
4.  **Botões com Finalização Incompleta**:
    *   *Problema*: É comum implementar botões de ação rápida (como "Enviar Orçamento") sem as devidas barreiras protetoras (como validação de número de telefone contendo apenas números ou limpeza de formato DDD), gerando bugs silenciosos de redirecionamento para caminhos inválidos.

---

## 📋 3. Planejamento de Melhorias Cuidadosas (Blueprint de Implementação)

Para garantir que cada botão e funcionalidade seja plenamente concluído e testado no futuro, dividimos as melhorias em três módulos distintos:

### MÓDULO A: Esteira Kanban Unificada na Home do Admin
*   Trazer as colunas de produção diretamente para a frente do Dashboard, facilitando a visualização rápida e interativa sobre qual estágio cada pedido (`PENDING_PAYMENT`, `PAID`, `QUEUE`, `PRINTING`, `FINISHING`, `SHIPPED`, `COMPLETED`) está estacionado.
*   Garantir clique intuitivo nos cards para abrir o painel lateral de edição completa, sincronizado via Firestore.

### MÓDULO B: Detalhador de Custos e Assistente de Orçamento Rápido
*   Implementar um widget sandbox "Calculadora Rápida" dividido visualmente em 3 colunas:
    1.  **Parâmetros de Entrada**: Nome do cliente opcional, WhatsApp, peso da peça em gramas (g) e tempo de execução estimado.
    2.  **Ajuste Fino de Custos**: Taxa de setup editável, preço do filamento por grama e custo operacional da máquina por hora.
    3.  **Demonstrativo Aberto**: Exibição em tempo real do custo direto de filamento somado ao custo de máquina, adicionando a taxa de setup e aplicando a margem de lucro percentual.

### MÓDULO C: Módulo Antifalhas de WhatsApp (Garra de Validação)
*   **Validador de Celular**: Filtrar caracteres como parênteses `()`, espaços e hífens `-`, inserindo automaticamente o prefixo do código de área do país `55` se ausente.
*   **Template Dinâmico Formatado**: Codificar o texto com negrito e quebras de linha limpas em Markdown, detalhando o peso em gramas, tempo, infill simulado e preço total em R$ (com vírgulas).
*   **Alerta de Segurança**: Bloquear o envio e disparar toast se o número conter menos de 10 dígitos.

---

## 🛡️ 4. Protocolo de Conclusão Técnica (Garantia de Entrega Total)

Para evitar botões instalados que não funcionam, adotaremos as seguintes diretrizes nas futuras implementações:
1.  **State Guards completos**: Toda ação que use campos de texto (`input`) deve ser controlada por `disabled` quando campos críticos estiverem vazios.
2.  **Fallback de API**: No caso do fechamento de instâncias do WhatsApp Web, certificar que a abertura ocorre em nova aba (`_blank`) com parâmetros higienizados.
3.  **Auditoria visual**: Uso de ícones expressivos da biblioteca `lucide-react` para complementar as ações práticas e evitar poluição visual.
