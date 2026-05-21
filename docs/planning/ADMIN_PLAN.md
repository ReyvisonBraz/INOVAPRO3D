# Plano de Expansão: Painel Administrativo Inovalt3D

Este documento serve como o Roadmap oficial para as funcionalidades do sistema de gestão da Inovalt3D.

## FASE 1: Core de Gestão (Operação Avançada)

### 1.1 Gestão de Catálogo & Produtos (CRUD)
- [ ] **Editor de Produtos**: 
    - Upload de múltiplas imagens com Drag-and-drop.
    - Campos para `Preço Base`, `Categoria`, `Tags` (ex: "mais vendido", "novo").
    - Toggle `Ativo/Inativo` para esconder produtos sem deletar.
- [ ] **Configurações Técnicas Customizadas**:
    - Definir `Infill` e `Layers` recomendados por produto para orientar o cliente.
    - Campo de `Tempo de Produção` estimado (ex: "3 dias úteis").
- [ ] **Gestão de Categorias**: Criar, renomear e organizar categorias dinamicamente.

### 1.2 Central de Pedidos (Workflow)
- [ ] **Lista de Pedidos em Tempo Real**:
    - Filtros rápidos por status (Pendente, Pago, Impressão, Finalizado).
    - Busca por ID do pedido ou e-mail do cliente.
- [ ] **Mudança de Status com Logs**:
    - Histórico de quem alterou o status e quando.
    - Botão de "Notificar Cliente" ao mudar para "Enviado".
- [ ] **Gestão de Orçamentos Customizados**:
    - Área específica para aprovar/reprovar orçamentos feitos via upload de arquivo STL.
    - Ferramenta para o Admin inserir o valor final após análise manual de arquivos complexos.

### 1.3 Gestão de Arquivos 3D (Asset Manager)
- [ ] **Repositório de Downloads**:
    - Botão centralizado para baixar os arquivos originais (STL/OBJ/STEP) enviados pelos clientes.
- [ ] **Visualizador WebGL Integrado**:
    - Preview rápido do modelo 3D diretamente no painel do admin antes de baixar para fatiar.
- [ ] **Instruções de Fatiamento**:
    - Campo de notas internas para o admin anotar configurações de suporte ou orientação da peça na mesa.

### 1.4 Dashboard de Visão Geral (Home do Admin)
- [ ] **Métricas Rápidas**:
    - Total de pedidos hoje.
    - Volume total de filamento estimado em uso.
    - Receita bruta do dia.
- [ ] **Alertas de Urgência**:
    - Lista de pedidos que estão próximos do prazo de entrega.


## FASE 2: Inteligência, Estoque e Vendas

### 2.1 Dashboard Financeiro & BI
- [ ] **Visão de Lucro**: Cálculo automático de Custo (Filamento + Energia) vs Preço de Venda.
- [ ] **Relatórios de Conversão**: Porcentagem de orçamentos feitos vs pedidos pagos.
- [ ] **Gráfico de Demanda**: Identificar quais categorias ou produtos são mais procurados por época.

### 2.2 Gestão de Materiais e Inventário (Inventory Control)
- [ ] **Estoque de Filamento**: 
    - Cadastro de rolos (Marca, Cor, Material, Peso restando).
    - Alerta de "Estoque Baixo" quando uma cor popular estiver acabando.
- [ ] **Calculadora de Desperdício**: Registro de impressões que falharam para descontar do lucro real.

### 2.3 Marketing e Conversão
- [ ] **Gerador de Cupons**: Criar códigos de desconto (Ex: BEMVINDO10) com data de expiração.
- [ ] **Editor de Showcase (Home/Catálogo)**: 
    - Escolha manual dos itens do banner principal.
    - Drag-and-drop para reordenar produtos na vitrine.

## FASE 3: CRM, Suporte e Comunicação

### 3.1 Gestão de Clientes (CRM)
- [ ] **Perfil de Cliente**: Ver histórico completo, preferências de cores e faturamento total (LTV).
- [ ] **Notas de Atendimento**: Notas internas para o admin lembrar de detalhes específicos de um cliente (ex: "cliente prefere acabamento fosco").

### 3.2 Suporte Integrado
- [ ] **Sistema de Tickets**: Centralizar dúvidas que chegam via formulário de contato.
- [ ] **FAQ Dinâmica**: Interface para o admin atualizar as perguntas frequentes sem precisar de código.

## FASE 4: Configurações Globais do Sistema

### 4.1 Logística e Taxas
- [ ] **Configuração de Frete**: Interface para atualizar preços de entrega ou integrar com APIs de correios.
- [ ] **Prazo Global**: Mudar o prazo médio de produção do site inteiro com um clique em casos de alta demanda.

### 4.2 Segurança e Acessos
- [ ] **Gestão de Roles**: Criar usuários "Operador" (vê pedidos) e "Gerente" (vê financeiro).
- [ ] **Audit Log**: Ver quem fez qual alteração crítica no sistema (preços, status, deletar produtos).


---
*Anote aqui novas idéias conforme o projeto evolui.*
