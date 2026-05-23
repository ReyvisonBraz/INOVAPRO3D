# Planejamento Inicial Parte a Parte

Data da analise: 2026-05-23
Projeto: Inovalt/Inovapro 3D

## Objetivo

Registrar a avaliacao inicial do projeto em frentes separadas, para permitir uma analise profunda e execucao focada sem misturar problemas de seguranca, produto, arquitetura, documentacao e qualidade tecnica.

Este conjunto de documentos parte da leitura do estado atual do repositorio:

- React + Vite + TypeScript
- Firebase Auth + Firestore
- Express/Vite server em `server.ts`
- Site publico com catalogo, orcamento, checkout, area do cliente e conhecimento
- Painel admin amplo, concentrado principalmente em `src/pages/admin/AdminDashboard.tsx`

## Ordem Recomendada

1. `01-seguranca-firestore-auth.md`
2. `02-encoding-textos-interface.md`
3. `03-documentacao-stack-real.md`
4. `04-admin-dashboard-arquitetura.md`
5. `05-checkout-pagamentos-pedidos.md`
6. `06-tipagem-modelagem-dados.md`
7. `07-build-dependencias-qualidade.md`
8. `08-analise-profunda-consolidada.md`
9. `09-plano-mestre-projeto-completo-funcional.md`

## Criterio de Prioridade

- Prioridade 0: pode expor dados, permitir acesso indevido ou comprometer o negocio.
- Prioridade 1: bloqueia validacao tecnica, deploy, manutencao ou experiencia basica.
- Prioridade 2: melhora arquitetura, velocidade de evolucao e confiabilidade.
- Prioridade 3: polimento, escalabilidade e refinamento operacional.

## Como Usar

Cada arquivo deve ser tratado como uma frente independente:

- Primeiro entender o problema.
- Depois validar evidencias no codigo.
- Em seguida definir o comportamento desejado.
- Por fim executar tarefas pequenas e verificaveis.

Ao concluir uma frente, atualizar o status neste indice.

## Etapa 2 - Detalhamento Profundo

A etapa 2 foi criada em:

- `planejamento/analise-inicial/etapa-2-detalhamento/00-etapa-2-indice.md`

Ela aprofunda cada frente em subplanos mais operacionais, com evidencias do codigo, riscos especificos, investigacao, execucao e criterios de aceite.

## Plano Mestre de Execucao

O plano para transformar o projeto em uma plataforma completa e funcional foi registrado em:

- `planejamento/analise-inicial/09-plano-mestre-projeto-completo-funcional.md`

## Status Geral

- [x] Seguranca Firestore/Auth analisada e corrigida inicialmente
- [ ] Encoding e textos corrigidos
- [ ] Documentacao alinhada com stack real
- [ ] Admin modularizado ou com plano de modularizacao aceito
- [ ] Checkout/pagamentos/pedidos revisados
- [x] Tipos de dominio iniciais definidos
- [x] Build/lint funcionando localmente
- [ ] Analise profunda revisada apos primeiras correcoes
