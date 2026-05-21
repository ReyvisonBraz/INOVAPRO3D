# Plano de Execução Detalhado e Crítico - Inovalt Admin OS

Este documento detalha o mapa de refinamento profundo e soluciona as lacunas funcionais identificadas. O objetivo é transformar interfaces que atualmente possuem pendências ou estão "secas" em um sistema com **operações completas e fluxo final a final**, incluindo métricas e ferramentas de padrão corporativo.

---

## 1. Módulo de Orçamentos (Quotes) - [PRIORIDADE MÁXIMA]
**Problema atual:** Faltam funções operacionais básicas. Listagem estática com botão "Aprovar" que não tem fluxo posterior ou painel de edição.
- **Subplano de Execução (CRUD + Fluxo):**
    - [ ] **Editar Orçamento:** Funcionalidade / modal para permitir alterar quantidades, valor final, material ou status ANTES de aprovação.
    - [ ] **Excluir Orçamento:** Adicionar opção de deletar orçamentos inválidos ou recusados, removendo do banco de dados (com confirmação de segurança).
    - [ ] **Fluxo Pós-Aprovação:** Após clicar em "Aprovar", para onde ele vai? O sistema DEVE automaticamente migrar/converter o orçamento para a aba de `Pedidos (Orders)`.
    - [ ] **Integração de Status:** O status muda para "Aguardando Pagamento", gerando um protocolo rastreável ou alterando status no firebase.
    - [ ] **Painel de Detalhes e Comunicação (Pro):** Garantir que visualizar o orçamento exiba todas as specs originais pedidas pelo cliente.
    - [ ] **Exportação e Envio (Pro):** Adicionar botão para "Gerar PDF" do orçamento e "Enviar via WhatsApp" (link de resposta pré-formatado com texto e protocolo).

## 2. Catálogo de Produtos e Serviços - [O CORE DO SISTEMA]
**Problema atual:** CRUD deficiente (Não é possível Criar, Excluir ou Alterar perfeitamente. Botões apenas na UI falhando ou incompletos.)
- **Subplano de Execução (CRUD Total):**
    - [ ] **Criação Efetiva:** Ação "Novo Produto" salvando impecavelmente no Firebase com todos os inputs (Nome, Preço de base, Detalhes técnicos, Imagem URL e Categoria).
    - [ ] **Edição (Update) e Duplicação (Pro):** Um clique no botão `Editar` precisa carregar ativamente os dados daquele produto no modal. Criar um botão extra para `Duplicar` produtos similares rapidamente.
    - [ ] **Exclusão (Delete) em Lote (Pro):** Implementar botão da lixeira e garantir que delete do Firebase sumindo da lista imediatamente após o clique.
    - [ ] **Gestão de Disponibilidade (Pro):** Adicionar campo de "Estoque" (se for revenda) ou "Disponibilidade de Tempo" (se for serviço), para que na view da loja o produto apareça esgotado ou indisponível.

## 3. Base de Clientes (CRM) - [GESTÃO DE USUÁRIOS E HISTÓRICO]
**Problema atual:** Cadê a opção de cadastrar, editar ou ver os pagamentos reais? O CRUD de clientes está incompleto.
- **Subplano de Execução (CRUD Total):**
    - [ ] **Cadastro Manual (Create):** Formulário no CRM para o Admin inserir um cliente (Nome, Email, Telefone/WhatsApp).
    - [ ] **Visão de Histórico (Read):** Clicar no cliente deve abrir os pagamentos associados a ele, listando `orders` conectadas e o LTV (Lifetime Value).
    - [ ] **Edição de Perfil (Update):** Permitir atualizar dados de contato e endereço do cliente direto no CRM.
    - [ ] **Exclusão / Banimento (Delete):** Recurso para excluir ou inativar permanentemente um cliente e todo o seu histórico no banco de dados.
    - [ ] **Tags de Segmentação (Pro):** Permitir adicionar etiquetas no cliente (ex: `VIP`, `B2B`, `Inadimplente`).
    - [ ] **Exportação em CSV (Pro):** Botão para exportar a listagem do CRM para um arquivo (útil em campanhas de e-mail e planejamento financeiro).

## 4. Vitrine (Showcase) - [GESTÃO DE LAYOUT E DESTAQUE]
**Problema atual:** Fluxo engessado, falta dinamismo para adicionar conteúdo à Landing Page.
- **Subplano de Execução (CRUD Total):**
    - [ ] **Novo Destaque (Create):** Opção clara de subir imagem, link, título e subtítulo para a Home.
    - [ ] **Visualização Antecipada (Read):** Cards ou emuladores mostrando exatamente como será visto pelo cliente no site (Desktop/Mobile).
    - [ ] **Edição Profunda (Update):** Botão para trocar apenas o link ou a imagem do banner sem precisar deletar e criar do zero.
    - [ ] **Exclusão Rápida (Delete):** Remover banners expirados ou feios com 1 clique (com confirmação).
    - [ ] **Destaque Temporário e Agendamento (Pro):** Controle mais robusto de Status (inativo para não deletar e perder o banner) e Data/Hora de Exibição.
    - [ ] **Tracking Simples (Pro):** Contabilizar simples "Clicks no Banner" caso ele tenha URL para alguma call to action externa.

## 5. Hub de Processamento de Pedidos (Orders) - [A EXECUÇÃO]
**Problema atual:** Após ser aprovado, o orçamento vira Pedido (`order`), mas não há ferramentas robustas para geri-lo.
- **Subplano de Execução (CRUD e Fluxo de Vida):**
    - [ ] **Criação Rápida (Create):** Possibilidade de criar um Pedido Express sem precisar passar pelo fluxo longo de Orçamento.
    - [ ] **Detalhamento do Pedido (Read):** Visualizar histórico de status, itens comprados e cliente atrelado.
    - [ ] **Atualização de Status (Update):** Alterar ativamente de `Aguardando Pagamento` para `Em Produção`, `Pronto para Retirada` ou `Enviado`. Enviar notificação em cada mudança.
    - [ ] **Cancelamento/Exclusão (Delete):** Cancelar pedidos (com opção de estornar ou não no histórico) ou deletá-los permanentemente em caso de spam.
    - [ ] **Notas Internas (Pro):** Campo de texto onde o admin pode salvar um recado secreto: "Cliente chato, material acabou e troquei por X". 

## 6. Central de Suporte e Ajuda (FAQ) - [AUTOATENDIMENTO]
**Problema atual:** Os clientes precisam tirar dúvidas via WhatsApp, perdendo o tempo do Admin. A base de conhecimento precisa ser preenchida.
- **Subplano de Execução (CRUD Total):**
    - [ ] **Nova Pergunta (Create):** Adicionar pergunta e resposta formatada (com suporte a quebras de linha/negrito).
    - [ ] **Listagem (Read):** Visualização de todas as perguntas ativas divididas por categorias (Pagamento, Entrega, Material).
    - [ ] **Modificação (Update):** Ajustar respostas ou atualizar informações desatualizadas.
    - [ ] **Remoção (Delete):** Excluir dúvidas pontuais que não valem mais.

## 7. Hub de Ferramentas, Logs e Sincronização - [CONTROLE GLOBAL]
**Problema atual:** Dúvida sobre funcionalidade do botão sincronizar (se age ou apenas atualiza).
- **Subplano de Execução:**
    - [ ] **Refresh Lógico (Fetch Data API):** O botão de sincornia precisa disparar ativamente o carregamento do Firebase (refetch) e limpar cache.
    - [ ] **UI Feedback:** Ter uma indicação visual ("Sincronizando...") ou Loading Spinner atrelado a essa chamada.
    - [ ] **Logs de Auditoria (Pro):** Transformar a aba/campo de Logs em um tracking de "Acesso Administrativo". Uma timeline que mostra: "Admin X mudou preço de Y em 20/05 as 11:00".
    - [ ] **Pesquisa Global (Pro):** Uma barra superior na UI para pesquisar rapidamente por Orçamentos ou Nomes de Clientes sem precisar ir até a aba deles.

---

# Resumo da Sequência de Ações para Execução:
1. **Ativar todos os fluxos CRUD quebrados ou estáticos do Catálogo e CRM** (resolver as falhas de Update, adicionar Duplicação, Exportação de CSV e Tags).
2. **Refinar Orçamentos**, adicionando geração de PDF para comunicação limpa, botão de WhatsApp e o fluxo que o destina como "Aguardando Pagamento".
3. **Organizar Vitrine e Sincronização** implementando Logs Reais, Agendamento de Vitrine, e o Sistema Completo de Gestão Operacional.