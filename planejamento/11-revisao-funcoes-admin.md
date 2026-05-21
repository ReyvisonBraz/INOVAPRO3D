# Planejamento Avançado: Auditoria e Arquitetura de Funções do Painel Administrativo

Este documento apresenta uma auditoria detalhada das funções administrativas da plataforma **Inovalt 3D** (Pedidos, Orçamentos e Catálogo). Ele descreve o comportamento atual (o que já funciona), identifica as lacunas de interatividade (botões sem ação ou dependentes de emulação) e projeta uma arquitetura técnica robusta para implementar as melhorias necessárias.

---

## 🛠️ 1. Módulo de Pedidos (Orders)

O módulo de Pedidos supervisiona o fluxo de produção física e faturamento de produtos do catálogo e orçamentos STL já aprovados.

```
       [ ORÇAMENTO APROVADO ] ────> status: "PENDING_PAYMENT" ─── WhatsApp / Pix
                                                │
                                                ▼ (Compensação)
       [ FILA DE PRODUÇÃO ] <─────── status: "PAID"
              │
              ▼
       [ EM IMPRESSÃO 3D ] ───> [ ACABAMENTO ] ───> [ ENVIADO / RASTREIO ] ───> [ ENTREGUE ]
```

### 🟢 O que já está funcionando (Produção)
* **Status em Tempo Real (onSnapshot)**: Notificação via Toast na tela assim que um novo pedido é interceptado no Firebase.
* **Filtro de Busca Textual**: Pesquisa unificada por Protocolo (ID) e por nome do cliente.
* **Detalhes do Manifesto**: Exibição completa das geometrias ou produtos comprados, incluindo opções de material, cor, quantidade e preços individuais.
* **Alteração de Estados**: Dropdown reativo que atualiza o status de faturamento e produção do pedido imediatamente no Firestore:
  - `PENDING_PAYMENT`, `PAID`, `QUEUE`, `PRINTING`, `FINISHING`, `SHIPPED`, `COMPLETED`.
* **Rastreamento de Logística**: Input integrado para salvar o código de rastreio dos Correios ou transportadora (`trackingCode`), com salvamento automático (*onBlur*).
* **Cobrança WhatsApp & Pix (PENDING_PAYMENT)**:
  - Geração de código Pix Copia e Cola estruturado com base no identificador do pedido.
  - Cópia com um clique para a área de transferência.
  - Envio direto de mensagem formatada para o celular do cliente no WhatsApp.
* **Destino de Logística**: Renderização do endereço de remessa estruturado (rua, número, bairro, cidade, CEP, etc.).

### ❌ Lacunas de Interatividade e Funcionalidades Pendentes
1. **Status Cancelado Omitido**: O fluxo comercial prevê cancelamentos por falta de pagamento ou por solicitação do cliente. No entanto, o status `CANCELLED` (ou `DECLINED`) está ausente do dropdown, impedindo auditorias limpas.
2. **Falta de Filtros Rápidos (Chips)**: Para gerenciar o dia a dia, o administrador precisa ver rapidamente quais peças estão na fila de faturamento ou em impressão, sem precisar rolar uma tabela longa.
3. **Ausência de Documentos de Produção (Packing Slip)**: Falta um botão para emitir ou imprimir uma folha de produção simplificada (Ordem de Serviço 3D) para o operador de impressora colar na máquina ativa na fábrica física.
4. **Exportação de Entregas**: Não há mecanismo para baixar relatórios de logística das peças concluídas ou aguardando envio.

### 📐 Proposta de Arquitetura de Melhorias (Módulo Pedidos)
* **Melhoria 1.1: Controle Dinâmico de Filtros (Chips)**:
  - Inserção de uma barra reativa de seleção de status logo acima da tabela de pedidos: `[Todos] [Pendentes] [Em Impressão] [Enviados] [Cancelados]`.
  - Atualização automática do estado local com base no chip ativo utilizando o array reativo do estado `orders`.
* **Melhoria 1.2: Inclusão do Status de Cancelamento**:
  - Adição da opção de status `CANCELLED` no painel lateral de pedidos e tratamento visual das bordas em tom pastel vermelho.
* **Melhoria 1.3: Geração de Ficha de Produção Física (O.S.)**:
  - Incorporação do botão **"Gerar Ficha de Máquina (PDF)"** no modal do pedido. Ele gerará uma blueprint focada em impressão que contém o arquivo STL, material, infill, tempo estimado e espaço para o operador de máquina marcar o check de controle de qualidade física.

---

## 🔬 2. Módulo de Orçamentos (Quotes)

O módulo de Orçamentos STL é o núcleo comercial e de engenharia da Inovalt 3D. É onde os uploads tridimensionais dos clientes são analisados, precificados e formalizados em propostas de manufatura.

### 🟢 O que já está funcionando (Produção)
* **Auditoria de Especificações de Entrada**: Exibição exata do material base, percentual de infill e faixa de preço inicial estimada pelo site, além de notas/requisitos técnicos enviados pelo cliente.
* **Campos de Refinamento de Engenharia**: Interface interativa para ajuste dinâmico do orçamento:
  - **Valor Final Aprovado**: Input de faturamento real em R$.
  - **WhatsApp do Cliente**: Input do número telefônico de contato rápido.
  - **Tempo de Impressão**: Estimativa real calculada no fatiador físico (ex: `4h 30m`).
  - **Peso Estimado**: Consumo em gramas do termoplástico escolhido.
  - **Densidade (Infill %)**: Slider visual que varia de 10% a 100%.
  - **Notas do Técnico**: Textarea para escrever pareceres profissionais ou orientações sobre a peça.
* **Integração de Faturamento Automatizada (Aprovar e Faturar)**:
  - Converte o arquivo em orçamento aprovado, gera um pedido correspondente no Firestore e muda o status do orçamento para `APPROVED`.
  - O modal se transforma em uma tela de confirmação de sucesso exuberante, exibindo o número do novo pedido, o resumo das especificações definitivas e o link para copiar a chave Pix correspondente.
* **Impressão Comercial de PDF**: Geração de Proposta Comercial limpa e profissional com validade de 15 dias, instruções formais de faturamento e política de confidencialidade garantida.
* **Canais de Respostas Rápidas**: Envio direto da proposta estruturada com parâmetros técnicos pelo WhatsApp do cliente.

### ❌ Lacunas de Interatividade e Funcionalidades Pendentes
1. **O Bug Crítico do Telefone (Perda de Dados)**:
   - Como diagnosticado, a função `handleSaveQuoteSpecifications` **não inclui** o campo `phone: editingQuotePhone` no objeto enviado ao Firestore. O dado se perde após o salvamento assim que a página é recarregada.
2. **Cálculo de Custo Manual (Chute do Administrador)**:
   - O preço é reajustado aleatoriamente no input sem base científica imediata. O administrador precisa de auxílio matemático para estimar custos exatos de fabricação a partir do tempo de máquina e peso da peça.
3. **Visualizador STL Emulado**:
   - O arquivo STL é representado como um texto. O engenheiro precisa baixar o arquivo no computador pessoal e abrir em softwares como Cura ou PrusaSlicer para avaliar as inclinações e necessidades de suporte da peça.
4. **Falta de Histórico de Ajustes**:
   - Se um orçamento for editado mais de uma vez, não há histórico visual interno de quem alterou o valor final de cobrança ou adicionou especificações técnicas extras.

### 📐 Proposta de Arquitetura de Melhorias (Módulo Orçamentos)
* **Melhoria 2.1: Correção Estrita da Persistência de Telefone**:
  - Adição do campo `phone: editingQuotePhone` de forma obrigatória no payload da função `handleSaveQuoteSpecifications`.
  - Script secundário para atualizar a coleção `customers` se houver associação ativa do usuário.
* **Melhoria 2.2: Painel Retrátil de Assistente de Precificação (Fórmula Dinâmica)**:
  - Inserção de uma ferramenta de **Calculadora de Custos** integrada ao modal de orçamento.
  - A fórmula usará as seguintes constantes configuráveis no modal:
    $$\text{Preço Sugerido} = (\text{Peso em g} \times \text{Custo do Filamento por g}) + (\text{Horas} \times \text{Custo Máquina/Hora}) + \text{Margem de Markup \%}$$
  - Um botão extra chamado **"Aplicar Preço Sugerido"** preencherá automaticamente o campo de preço de faturamento (`editingQuoteTotal`).
* **Melhoria 2.3: Botão de Download Rápido e Detalhes Dimensionais**:
  - Criação de um botão de download mais visível e intuitivo para o arquivo STL.
  - Exibição de estatísticas associadas que auxiliam o faturamento.

---

## 🎨 3. Módulo de Catálogo de Produtos (Catalog)

Responsável por comercializar os produtos autorais e de reposição prontos produzidos em série pela Inovalt 3D.

### 🟢 O que já está funcionando (Produção)
* **Grade Visual Compacta**: Cartões informativos de produtos tridimensionais, organizados com tags de categoria, preço de venda e indicador dinâmico de ativo/inativo.
* **Adição e Edição via Form Integrado**:
  - Modificação do nome, preço, imagens base, estoque numérico e descrição do catálogo.
  - Parametrização técnica padrão (Infill %, Resolução de Camada e Tempo Médio de Impressão de fábrica).
* **Multiplicação de Itens (Duplicação Eficiente)**:
  - Função `handleDuplicateProduct` clonando todos os metadados de uma peça existente e gerando uma cópia rápida para facilitar cadastros sequenciais.
* **Exclusão Integrada com Diálogo de Segurança**:
  - Remoção direta de produto obsoleto da coleção `products` do Firestore.

### ❌ Lacunas de Interatividade e Funcionalidades Pendentes
1. **Controle de Imagens de Forma Única (URL Text)**:
   - Embora o schema represente `images` como um array de strings para carregar carrosséis de produtos, o input administrativo atual limita-se a aceitar apenas uma e única URL em formato de texto no campo `newProduct.images[0]`. O painel carece de um gerenciador de galeria simplificada.
2. **Definição Estática de Categorias**:
   - As categorias estão engessadas no formulário (`DECORAÇÃO`, `INDUSTRIAL`, etc.). Não há tela para inserir uma nova categoria para agrupar produtos temáticos de forma ágil.
3. **Ausência de Alerta de Estoque Mínimo**:
   - Não há aviso visual claro ao administrador se a peça em série atingiu nível crítico ou esgotado na grade geral sem abrir o modal de detalhes correspondente.

### 📐 Proposta de Arquitetura de Melhorias (Módulo Catálogo)
* **Melhoria 3.1: Suporte a Grades de Imagens Expandidas**:
  - Transformação do input de imagem única em um gerenciador de mídia dinâmico, onde o administrador pode adicionar até 3 URLs sequenciais em campos reativos adicionais.
* **Melhoria 3.2: Identificação de Estoque Crítico na Tabela**:
  - Se `product.stock === 0`, o card correspondente exibirá um badge pulsante vermelho de **Esgotado**. Se `product.stock <= 3`, exibirá **Estoque Crítico (X unidades)** para chamar a atenção do gerente de reabastecimento imediatamente.

---

## 📋 4. Cronograma de Implementação Proposto

Com base nesta auditoria completa, dividimos o plano de execução nas seguintes sprints organizadas de desenvolvimento:

| SPRINT | FOCO DO DESENVOLVIMENTO | ARQUIVOS MODIFICADOS | IMPACTO DO TRABALHO |
| :---: | :--- | :--- | :--- |
| **Sprint A** | **Correção de Persistência**<br>Garantir que o telefone e demais especificações do orçamento nunca mais se percam no Firestore; sinc com o banco e re-render reativo instantâneo. | `AdminDashboard.tsx`<br>`firebase-blueprint.json` | **Básico & Urgente**<br>Resolve as perdas de dados críticas relatadas. |
| **Sprint B** | **Auxílio de Precificação & Calculadora**<br>Implementação do painel retrátil de cálculo de orçamentos com base no peso de termoplástico e horas da máquina ativa na fábrica. | `AdminDashboard.tsx` | **Intermediário**<br>Elimina a necessidade de planilhas externas para cálculo de propostas. |
| **Sprint C** | **Polimento e Filtros do Administrador**<br>Criação dos chips rápidos de filtragem na tela de pedidos e inclusão de feedbacks detalhados sobre estoque e status cancelados. | `AdminDashboard.tsx` | **Avançado**<br>Eleva a experiência de navegação do gerente geral. |

---

### 💬 Como prosseguir?
Nossa equipe cobriu todos os ângulos fundamentais e técnicos do painel administrativo. Por favor, revise este balanço estratégico. 

Uma vez aprovado, estamos 100% prontos para dar início à implementação e resolver as perdas de dados junto com as novas ferramentas incríveis descritas!
