# Etapa 2 - Detalhamento Profundo dos Planos

Data: 2026-05-23

## Objetivo da Etapa 2

A etapa 1 criou o mapa inicial. A etapa 2 transforma cada frente em um subplano mais profundo, com:

- evidencias encontradas no codigo;
- riscos especificos;
- decisoes que precisam ser tomadas;
- tarefas pequenas em ordem de execucao;
- criterios de aceite mais objetivos;
- pontos que precisam ser validados no navegador, no build ou no Firebase.

## Subplanos

1. `01-seguranca-firestore-auth-detalhado.md`
2. `02-encoding-conteudo-detalhado.md`
3. `03-documentacao-stack-detalhado.md`
4. `04-admin-dashboard-modularizacao-detalhado.md`
5. `05-checkout-pedidos-pagamentos-detalhado.md`
6. `06-tipagem-dominio-detalhado.md`
7. `07-build-qualidade-detalhado.md`
8. `08-analise-profunda-etapa-2.md`

## Ordem de Execucao Recomendada

1. Seguranca Firestore/Auth.
2. Build e dependencias, para revelar erros reais.
3. Checkout/pedidos/pagamentos, porque envolve dinheiro e status.
4. Tipagem de dominio, com foco em usuario, pedido, produto e quote.
5. Admin dashboard, por extracao gradual.
6. Documentacao da stack real.
7. Encoding/conteudo, com validacao visual para separar problema real de exibicao do terminal.

## Observacao Importante Sobre Encoding

Na analise inicial, alguns outputs do PowerShell exibiram textos quebrados. Depois, `rg` mostrou que parte dos arquivos contem UTF-8 correto. Portanto, esta frente precisa ser tratada com cuidado:

- nao substituir textos em massa sem validar bytes reais;
- confirmar no navegador e no editor;
- corrigir apenas ocorrencias reais de mojibake no arquivo.

