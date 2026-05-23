# 07 - Build, Dependencias e Qualidade - Subplano Detalhado

## Escopo

Garantir que o projeto instala, roda, compila e permite validacao tecnica confiavel.

## Evidencias no Ambiente

- `npm run lint` falhou porque `tsc` nao foi encontrado.
- `node_modules` nao parece estar presente no workspace.
- `package.json` possui `typescript` em `devDependencies`.
- Script `clean` usa `rm -rf dist`, que nao e portavel para Windows PowerShell.
- Projeto usa Vite + Express custom server.

## Riscos

- O projeto pode ter erros TypeScript ainda invisiveis.
- Build pode falhar por React 19, Tailwind 4 ou alias.
- Dev server pode subir, mas build de producao quebrar.
- Scripts podem funcionar em Unix e falhar no Windows.

## Plano de Investigacao

- [ ] Confirmar se `node_modules` existe.
- [ ] Rodar `npm install`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run build`.
- [ ] Rodar `npm run dev`.
- [ ] Abrir app no navegador.
- [ ] Testar rotas principais.

## Ajustes Provaveis

- Trocar `clean` por comando compativel com Windows ou pacote cross-platform.
- Ajustar `tsconfig` se o typecheck revelar problemas.
- Rever `allowJs: true`, se nao houver JS no projeto.
- Validar alias `@` apontando para raiz.
- Confirmar se `firebase-applet-config.json` nao contem dados sensiveis.

## Rotas Para Smoke Test

- `/`
- `/catalogo`
- `/produto/:id`
- `/upload`
- `/calculadora`
- `/checkout`
- `/meus-pedidos`
- `/admin`
- `/conhecimento`

## Criterios de Aceite

- `npm install` conclui.
- `npm run lint` conclui.
- `npm run build` conclui.
- Dev server sobe.
- Pelo menos home e admin renderizam sem tela branca.
- Erros esperados de permissao Firebase ficam documentados.

## Saida Esperada da Etapa

Ao final, adicionar neste documento:

- versao do Node usada;
- resultado dos comandos;
- erros encontrados;
- correcoes feitas;
- pendencias.

## Validacao Realizada - 2026-05-23

### Comandos Executados

- `npm.cmd install`
- `npm.cmd run lint`
- `npm.cmd run build`

### Resultado

- `node_modules` nao existia inicialmente.
- `npm.cmd install` precisou de permissao escalada porque a instalacao precisava gravar no cache do npm fora do sandbox.
- Instalacao concluiu com `found 0 vulnerabilities`.
- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Avisos Restantes

- O build gera aviso de chunk JavaScript maior que 500 kB.
- Isso nao bloqueia producao, mas indica necessidade futura de code splitting, principalmente no admin e dependencias grandes como Firebase/Three/Recharts.

### Pendencias

- Registrar versao de Node usada.
- Rodar smoke test no navegador com o dev server.
- Considerar separacao de chunks na fase de performance.
