# 07 - Build, Dependencias e Qualidade Tecnica

## Prioridade

Prioridade 1. Sem build confiavel, qualquer correcao fica parcialmente cega.

## Arquivos Envolvidos

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `server.ts`
- `node_modules/` local

## Diagnostico Inicial

O comando `npm run lint` chama `tsc --noEmit`, mas falhou porque `tsc` nao foi encontrado no ambiente local.

Isso indica que:

- `node_modules` provavelmente nao esta instalado.
- Ou a instalacao esta incompleta.
- Ou o PATH local nao esta enxergando `.bin`.

Tambem ha um script `clean` usando `rm -rf dist`, que nao e nativo do PowerShell/Windows.

## Risco Principal

Sem typecheck/build rodando, nao ha garantia de que o projeto compila. O repositorio pode parecer funcional por leitura, mas quebrar ao executar.

## Analise Necessaria

Verificar:

- Se `npm install` roda corretamente.
- Se `npm run lint` passa depois da instalacao.
- Se `npm run build` gera `dist`.
- Se o servidor Express funciona em dev.
- Se ha conflitos React 19 + bibliotecas.
- Se Tailwind 4 esta configurado corretamente.
- Se scripts sao portaveis para Windows.

## Resultado Esperado

Ter uma rotina minima confiavel:

- `npm install`
- `npm run lint`
- `npm run build`
- `npm run dev`

Opcionalmente:

- script de formatacao
- testes basicos
- verificacao das regras Firestore

## Plano de Execucao

- [ ] Instalar dependencias.
- [ ] Rodar `npm run lint`.
- [ ] Corrigir erros TypeScript.
- [ ] Rodar `npm run build`.
- [ ] Corrigir erros de build.
- [ ] Ajustar script `clean` para ser compativel com Windows.
- [ ] Documentar comandos no README.
- [ ] Considerar adicionar CI futuramente.

## Criterios de Aceite

- TypeScript passa sem erros.
- Build de producao passa.
- Dev server sobe localmente.
- README reflete os comandos reais.

