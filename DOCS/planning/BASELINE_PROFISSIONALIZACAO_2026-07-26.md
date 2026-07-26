# Baseline de profissionalização — 26/07/2026

Esta é a referência técnica inicial para a profissionalização segura do INOVAPRO3D.
Ela registra o estado conhecido antes das próximas refatorações estruturais.

## Identificação

- Branch: `main`
- SHA funcional de referência: `4c5bbacaa6391f5d0c204d49936841c57bdf9168`
- Produção: `https://www.inovapro3d.com.br`
- Runtime de CI: Node.js 22
- Hospedagem: Vercel
- Repositório: `ReyvisonBraz/INOVAPRO3D`

## Estado automatizado inicial

Os valores abaixo devem ser atualizados apenas quando a mudança for intencional:

- TypeScript: aprovado com `tsc --noEmit`.
- Testes: 6 arquivos e 53 testes aprovados.
- ESLint: 0 erros e 17 advertências preexistentes.
- Build: aprovado.
- Limite temporário do CI: no máximo 17 advertências de lint. Assim, uma alteração
  nova não pode aumentar a dívida atual.

## Bundles maiores observados

Tamanhos aproximados dos arquivos não comprimidos gerados antes deste lote:

| Bundle | Tamanho |
|---|---:|
| `vendor-3d` | 956 KB |
| `vendor-firebase` | 464 KB |
| `vendor-charts` | 364 KB |
| `AdminDashboard` | 268 KB |
| `vendor-react` | 260 KB |
| CSS principal | 164 KB |
| JavaScript principal | 160 KB |

Esses números são uma referência, não uma meta imediata. A otimização ocorrerá
somente depois de medição por rota.

## Checklist manual de rotas críticas

Executar em desktop e em viewport mobile antes de concluir mudanças de risco médio
ou alto:

- [ ] `/` — home carrega, navegação e produtos em destaque funcionam.
- [ ] `/catalogo` — busca, filtros e abertura de produto funcionam.
- [ ] `/produto/:id` — dados, imagens, preço e ações carregam.
- [ ] `/calculadora` — projeto simples, multicolor e multiparte calculam.
- [ ] `/admin` — autenticação e visão geral carregam sem tela em branco.
- [ ] `/admin` — calculadora abre em tela cheia, minimiza e recupera rascunho.
- [ ] `/admin` — orçamentos abrem e exibem os dados salvos.
- [ ] `/admin` — configurações carregam e salvam.

## Referência visual

As capturas visuais ainda precisam ser organizadas em um lote próprio para não
misturar credenciais e dados administrativos com o repositório. Devem cobrir:
home, catálogo, produto, calculadora, visão geral do admin, orçamentos e
configurações, em desktop e mobile.

## Dados e integrações a mapear

O inventário detalhado de coleções Firebase e documentos de configuração permanece
pendente. Ele será feito de forma somente leitura antes da Fase 3, incluindo a
separação entre configurações públicas e administrativas.

## Regra de comparação

Uma mudança é regressiva quando:

1. quebra uma rota do checklist;
2. altera a matemática sem fixture e aprovação explícita;
3. aumenta o número de advertências do lint acima da baseline;
4. faz TypeScript, testes ou build falharem;
5. aumenta de forma relevante um bundle sem justificativa medida.
