# Reformulacao profissional do painel administrativo

## Direcao

O painel deve parecer uma ferramenta operacional madura: rapido de ler, compacto,
previsivel e confortavel em desktop e celular. A referencia funcional e o Medusa
Admin, principalmente sua hierarquia, tabelas, filtros e composicao por secoes.
A identidade continua sendo da INOVAPRO3D.

## Diagnostico atual

- Raios de 32-56px e caixa alta em excesso diminuem a densidade de informacao.
- Barras de titulo, filtros, tabelas e estados vazios variam entre as abas.
- `AdminDashboard.tsx` concentra modais e formularios demais.
- A busca global desaparece no celular.
- Varias acoes importantes dependem de hover ou `window.prompt`.
- Tabelas desktop e cards mobile duplicam muita marcacao.
- Contraste e foco precisam de contratos consistentes.

## Principios

1. Hierarquia antes de decoracao: titulo, contexto, acao primaria e dados.
2. Densidade confortavel: cards 12-16px, paineis 16-24px, raio 10-16px.
3. Uma linguagem: toolbar, tabela, badge, vazio, formulario e modal compartilhados.
4. Acao primaria sempre visivel; destruicao dentro de menu ou confirmacao.
5. Mobile nao e desktop empilhado: filtros recolhiveis, cards de resumo e drawers.
6. Status usa texto + cor; cor nunca e o unico indicador.
7. Estados de carregamento, vazio, erro e sucesso em toda consulta.

## Fases

### Fase 1 - Fundacao

- Tokens e classes administrativas isoladas.
- Sidebar e header responsivos.
- Componentes `AdminSectionHeader`, `AdminPanel`, `AdminEmptyState` e badges.
- Larguras, espacamentos, foco e scroll consistentes.

### Fase 2 - Operacao principal

- Pedidos: views salvas, filtros claros, kanban/tabela e detalhe em drawer.
- Orcamentos: lista compacta, criacao guiada e conversao com resumo.
- Clientes: tabela responsiva, metricas, perfil e historico.
- Materiais: saldo, reserva, cobertura e movimentacoes sem prompts nativos.

### Fase 3 - Catalogo e relacionamento

- Produtos, categorias, vitrine, cupons, suporte, avaliacoes e FAQs.
- Formularios extraidos do dashboard e validacao por secao.

### Fase 4 - Sistema e qualidade

- Ajustes e auditoria com navegacao secundaria.
- Acessibilidade, atalhos, skeletons, testes de componentes e QA visual.

## Criterios de aceite

- Operacoes primarias funcionam a 360px sem scroll horizontal da pagina.
- Navegacao e busca acessiveis por teclado.
- Nenhuma acao critica depende apenas de hover.
- Todas as abas usam os mesmos contratos de cabecalho e painel.
- Build, testes e lint sem novos erros.
- QA autenticado em desktop e mobile antes de deploy.

## Revisao funcional inspirada no Medusa - segunda etapa

O primeiro redesign resolveu a fundacao visual, mas um painel operacional tambem
precisa oferecer CRUD completo e fluxos previsiveis. A estrutura de rotas do
Medusa Admin evidencia dominios separados para clientes, grupos, produtos,
variantes, inventario, reservas, colecoes, listas de preco, promocoes, pedidos,
usuarios e auditoria. Para a INOVAPRO3D, a adaptacao deve priorizar:

### P0 - operacao obrigatoria

- Clientes: visualizar, editar, validar contato, observacoes, tags, endereco e historico.
- Produtos: criar, editar, duplicar, ativar/desativar e excluir com confirmacao.
- Pedidos: detalhe completo, alteracao de status, pagamento, entrega e historico.
- Materiais: editar cadastro, registrar movimento e exibir livro-razao por filamento.
- Acoes destrutivas: confirmacao contextual; remover `prompt` e exclusao direta.

### P1 - catalogo profissional

- Variantes por produto (material, cor, tamanho/acabamento) com preco e disponibilidade.
- Estado de publicacao: rascunho, publicado e arquivado.
- Colecoes e tags reutilizaveis, sem depender apenas de categoria.
- Duplicacao de produto e edicao em lote de status/categoria/estoque.
- Painel lateral de detalhes para manter o contexto da lista.

### P1 - clientes e vendas

- Segmentos/grupos de clientes (VIP, B2B, recorrente, revendedor).
- Linha do tempo unificada: pedidos, orcamentos, notas e alteracoes.
- Criar pedido ou orcamento diretamente no perfil do cliente.
- Indicadores de ticket medio, ultima compra e dias sem comprar.

### P2 - governanca e escala

- Log administrativo automatico para alteracoes relevantes.
- Paginacao no servidor em vez de carregar colecoes completas.
- Filtros persistentes e views salvas.
- Permissoes separadas para ADMIN e OPERATOR.
- Importacao/exportacao CSV com validacao e relatorio de erros.

## Estado atual

- Fundacao visual: concluida.
- Pedidos/orcamentos manuais e estoque de filamento: concluidos.
- Edicao de clientes: corrigida nesta segunda etapa.
- Catalogo avancado, variantes, acoes em lote e timeline: pendentes por prioridade.
