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

