# UX/UI — Calculadora Bambu responsiva

## Objetivo visual

A calculadora deve parecer uma ferramenta profissional de produção, não um
formulário administrativo genérico. A pessoa precisa entender rapidamente:

1. qual projeto está calculando;
2. quais dados copiar do Bambu Studio;
3. quanto cada bandeja custa;
4. quais campos ainda faltam;
5. qual é o custo e o preço final;
6. quando o estoque é apenas previsto e quando será movimentado.

Prioridades:

- legibilidade;
- poucos campos visíveis por vez;
- linguagem igual à operação;
- contraste acessível;
- resultado sempre fácil de encontrar;
- mesma experiência na calculadora completa e no painel;
- funcionamento confortável com toque e teclado.

---

## Direção visual

### Personalidade

- técnica;
- industrial;
- limpa;
- precisa;
- sem excesso de brilho, gradientes ou textos em caixa alta;
- azul apenas para ações e seleção;
- verde apenas para sucesso/valor saudável;
- amarelo apenas para atenção;
- vermelho apenas para erro bloqueante ou ação destrutiva.

### Paleta semântica

| Uso | Fundo | Texto/borda |
|---|---|---|
| Tela | `#080B12` | — |
| Superfície principal | `#10151F` | `#E8EDF5` |
| Superfície secundária | `#151B27` | `#BAC5D6` |
| Campo | `#0B1019` | `#F3F6FA` |
| Borda padrão | transparente/branca a 10% | — |
| Ação primária | `#2563EB` | branco |
| Seleção técnica | azul a 10% | `#93C5FD` |
| Sucesso | verde a 10% | `#6EE7B7` |
| Atenção | âmbar a 10% | `#FCD34D` |
| Erro | vermelho a 10% | `#FCA5A5` |
| Texto principal | — | `#F8FAFC` |
| Texto secundário | — | `#A8B3C5` |
| Texto auxiliar | — | `#718096` |

Nunca usar texto importante abaixo de aproximadamente 65% de branco sobre
fundo escuro. Textos auxiliares pequenos devem manter contraste suficiente.

### Tipografia

- interface: Inter/system sans;
- valores financeiros e medidas: fonte monoespaçada;
- título da página: 28–32 px desktop, 22–24 px mobile;
- título de seção: 16–18 px;
- título de bandeja: 14–16 px;
- corpo: 14 px;
- campo: mínimo 16 px no mobile para evitar zoom automático;
- rótulo: 12–13 px;
- ajuda: 12 px;
- nunca depender apenas de texto de 9–10 px.

Caixa alta somente para pequenas etiquetas de status. Nomes de campos, botões e
títulos usam capitalização normal.

---

## Arquitetura da tela

### Desktop

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Calculadora Bambu Studio             Configuração sincronizada ✓    │
│ Dados reais do fatiador · orçamento sem baixa de estoque            │
├───────────────────────────────────────────────┬─────────────────────┤
│                                               │ Resumo do projeto   │
│ Projeto                                       │                     │
│ [Nome do projeto________________________]      │ Custo previsto      │
│                                               │ R$ 42,80            │
│ Bandeja 1                                     │                     │
│ ┌───────────────────────────────────────────┐ │ Varejo              │
│ │ Nome · Tipo · Tempo · Peças · Repetições │ │ R$ 107,00           │
│ │                                           │ │                     │
│ │ Filamentos                                │ │ Material   R$ 18,20 │
│ │ PLA Preto                     41,76 g      │ │ Energia     R$ 1,40 │
│ │ PLA Branco                     8,67 g      │ │ Máquina    R$ 9,20 │
│ │ [+ Adicionar filamento]                   │ │ Outros      R$ 0,00 │
│ └───────────────────────────────────────────┘ │                     │
│                                               │ [Salvar orçamento]  │
│ [+ Adicionar bandeja]                         │ [Enviar WhatsApp]    │
│                                               │                     │
│ Custos opcionais ▸                            │                     │
└───────────────────────────────────────────────┴─────────────────────┘
```

Regras:

- conteúdo central máximo entre 1.440 e 1.600 px;
- coluna principal flexível;
- resumo com 360–400 px;
- resumo em `sticky`, respeitando o cabeçalho;
- campos técnicos não devem disputar espaço com valores financeiros;
- largura confortável para leitura, sem cartões excessivamente largos.

### Tablet

- grade principal vira uma coluna;
- resumo aparece depois das bandejas;
- uma barra compacta de resultado pode permanecer fixa no rodapé;
- campos da bandeja usam duas colunas;
- filamentos ocupam largura completa.

### Mobile

```text
┌──────────────────────────────┐
│ Calculadora Bambu            │
│ Orçamento sem baixa de estoque│
├──────────────────────────────┤
│ Nome do projeto              │
│ [__________________________] │
│                              │
│ Bandeja 1             52,4 g │
│ ┌──────────────────────────┐ │
│ │ Nome                     │ │
│ │ [______________________] │ │
│ │                          │ │
│ │ [Cor única] [Multicolor] │ │
│ │                          │ │
│ │ Tempo total              │ │
│ │ [2h25m_________________] │ │
│ │                          │ │
│ │ Peças       Repetições   │ │
│ │ [1_______]  [1________]  │ │
│ │                          │ │
│ │ Filamentos               │ │
│ │ PLA Preto       41,76 g  │ │
│ │ PLA Branco       8,67 g  │ │
│ │ [+ Adicionar]            │ │
│ └──────────────────────────┘ │
│                              │
│ [+ Adicionar bandeja]        │
│ Custos opcionais ▸           │
│                              │
│ espaço para barra fixa       │
├──────────────────────────────┤
│ Custo R$42,80 · Varejo R$107 │
│ [Revisar e salvar]           │
└──────────────────────────────┘
```

Regras:

- uma coluna;
- padding lateral de 16 px;
- alvos de toque com no mínimo 44 px;
- inputs com altura de 48–52 px;
- barra inferior fixa com área segura do iOS;
- não usar tabelas horizontais;
- cada linha de filamento vira cartão compacto;
- ações destrutivas ficam em menu ou botão secundário, longe de “Adicionar”;
- bandejas podem ser recolhidas depois de válidas;
- ao abrir uma bandeja, as demais podem permanecer recolhidas.

---

## Cabeçalho

### Conteúdo

- título: `Calculadora Bambu Studio`;
- subtítulo: `Use o tempo e o consumo total apresentados pelo fatiador`;
- badge: `Parâmetros sincronizados`;
- aviso discreto: `O orçamento registra consumo previsto. O estoque não será
  alterado agora.`

Remover:

- nomes de versão sem utilidade operacional;
- slogans técnicos repetidos;
- excesso de badges;
- textos em caixa alta com espaçamento exagerado.

---

## Cartão de bandeja

### Cabeçalho recolhido

Exibir:

- número e nome;
- tipo;
- peso;
- tempo;
- subtotal;
- status: completa ou incompleta;
- botão expandir;
- menu com duplicar e excluir.

Exemplo:

```text
Bandeja 2 · Olhos                 Completa ✓
Multicolor · 50,43 g · 2h25m       R$ 18,70
```

### Conteúdo expandido

Ordem:

1. nome da bandeja;
2. seletor segmentado `Cor única | Multicolor`;
3. tempo total;
4. peças e repetições;
5. filamentos;
6. subtotal da bandeja.

### Seletor de tipo

Usar controle segmentado, não `select`.

- estado ativo com fundo azul e texto branco;
- estado inativo com fundo neutro;
- explicar:
  - Cor única: uma linha de filamento;
  - Multicolor: duas ou mais linhas.

Ao trocar multicolor para cor única com várias linhas, pedir confirmação antes
de remover dados.

---

## Entrada de filamentos

### Linha salva

Desktop:

```text
[cor] PLA High Speed Preto · Marca       Estoque: 680 g   [41,76 g] [⋯]
```

Mobile:

```text
● PLA High Speed Preto
  Marca · Estoque: 680 g
  Consumo total                 41,76 g
  [Editar] [Remover]
```

### Adicionar

Abrir um pequeno painel/modal em vez de manter todos os campos manuais sempre
visíveis.

Primeira escolha:

```text
[Selecionar do estoque] [Informar manualmente]
```

Estoque:

- busca por nome, cor, marca e tipo;
- bolinha com a cor;
- saldo disponível;
- preço/kg ou preço/g;
- campo `Total (g) do Bambu`;
- botão `Adicionar filamento`.

Manual:

- cor;
- marca;
- tipo;
- preço/kg;
- total em gramas;
- exemplo visível: `Preto · 3D Fila · PLA High Speed`.

### Multicolor

- mostrar contador `2 filamentos`;
- permitir adicionar quantos forem necessários;
- não exigir Modelo, Corado e Torre na versão enxuta;
- texto: `Use a coluna Total de cada filamento no Bambu Studio`.

---

## Campos

Cada campo precisa ter:

- rótulo persistente;
- unidade fixa à direita;
- exemplo ou ajuda curta;
- mensagem de erro abaixo;
- estado de foco claro;
- navegação por teclado;
- `inputMode` adequado no mobile.

### Tempo

- aceitar `2h25m`, `2:25` e `2.42`;
- mostrar conversão abaixo: `2 h 25 min`;
- nunca substituir silenciosamente o texto enquanto a pessoa digita.

### Números

- permitir vírgula e ponto;
- exibir formatação brasileira depois do `blur`;
- não mostrar `0` como valor preenchido em campos obrigatórios novos;
- não apagar o conteúdo durante edição;
- unidades: `g`, `h`, `R$/kg`, `un.`.

### Peças e repetições

Mostrar ajuda:

- `Peças`: quantas unidades esse fatiamento produz;
- `Repetições`: quantas vezes a bandeja será impressa.

---

## Custos opcionais

Seção recolhida por padrão:

```text
Custos opcionais                      R$ 0,00
Mão de obra, embalagem e insumos              ▾
```

Dentro:

- mão de obra com switch desligado;
- embalagem em R$ 0;
- insumos em R$ 0;
- acabamento/modelagem somente quando forem implementados.

Campos desativados não entram no cálculo.

Não mostrar taxa de falha automática na calculadora operacional. Falhas reais
serão registradas na produção.

---

## Resumo financeiro

### Hierarquia

1. custo previsto;
2. preço de varejo;
3. preço de atacado;
4. preço unitário;
5. lucro e margem;
6. composição do custo.

O valor principal não deve ocupar espaço exagerado nem quebrar em telas
pequenas.

### Composição

```text
Material                         R$ 18,20
Energia                           R$  1,40
Máquina                           R$  9,20
Custos opcionais                  R$  0,00
────────────────────────────────────────
Custo previsto                    R$ 28,80
```

Usar cores nas pequenas barras/ícones, não em todo o texto.

### Mobile

Barra fixa:

```text
Custo R$ 28,80     Varejo R$ 72,00
[Revisar e salvar]
```

Ao tocar, abrir resumo completo em `bottom sheet`.

---

## Salvamento

Usar uma etapa de revisão:

```text
Revisar orçamento
```

Mostrar:

- cliente;
- projeto;
- bandejas;
- filamentos manuais;
- alertas de estoque;
- custo e preço;
- confirmação de que não haverá baixa de estoque.

Somente nessa etapa pedir:

- nome do cliente;
- WhatsApp;
- imagem opcional.

Isso impede que dados comerciais poluam a entrada técnica.

Botão final:

```text
Salvar orçamento previsto
```

Evitar apenas `Salvar`, porque não explica o efeito.

---

## Validação e mensagens

### Erro bloqueante

- borda vermelha;
- ícone;
- mensagem junto ao campo;
- resumo no topo;
- ao salvar, rolar e focar o primeiro erro;
- abrir automaticamente a bandeja com erro.

Exemplos:

- `Informe o tempo total mostrado pelo Bambu.`
- `Adicione um filamento a esta bandeja.`
- `Multicolor precisa de pelo menos dois filamentos.`
- `Informe o preço por kg do filamento manual.`

### Atenção não bloqueante

Âmbar:

- estoque abaixo do previsto;
- filamento com preço manual;
- valor calculado abaixo do piso antes da aplicação;
- repetição acima de 1.

Texto de estoque:

```text
Estoque abaixo do previsto
PLA Branco: necessário 120 g · disponível 83 g

Você pode salvar o orçamento. A disponibilidade será validada novamente antes
da produção.
```

### Sucesso

Verde:

- bandeja completa;
- orçamento salvo;
- parâmetros sincronizados.

Não depender apenas da cor: sempre incluir ícone e texto.

---

## Acessibilidade

- contraste mínimo WCAG AA;
- foco visível em todos os controles;
- rótulos associados aos inputs;
- erros anunciados com `role="alert"`;
- botões com nomes acessíveis;
- não usar cor como único indicador;
- respeitar `prefers-reduced-motion`;
- animações entre 150 e 220 ms;
- nenhum conteúdo essencial somente em tooltip;
- ordem de tabulação igual à ordem visual.

---

## Estados necessários

### Vazio

- uma bandeja inicial;
- exemplos claros;
- nenhum custo variável;
- resultado em R$ 0 ou estado `Preencha a primeira bandeja`.

### Carregando

- skeleton curto nos filamentos do estoque e parâmetros;
- não bloquear campos que independem do servidor.

### Sem estoque cadastrado

- explicar;
- botão `Usar filamento manual`;
- link administrativo para cadastrar estoque.

### Erro de sincronização

- manter os dados digitados;
- indicar que os parâmetros centrais não foram carregados;
- permitir tentar novamente;
- não salvar silenciosamente com parâmetros incertos.

### Orçamento salvo

- confirmação com número do orçamento;
- ações:
  - abrir orçamento;
  - enviar WhatsApp;
  - iniciar novo cálculo.

---

## Componentes a criar/refatorar

```text
CalculatorWorkspace
├── CalculatorHeader
├── ProjectIdentity
├── PlateList
│   └── PlateCard
│       ├── PlateHeader
│       ├── PlateBasics
│       └── FilamentUsageList
│           ├── FilamentUsageRow
│           └── AddFilamentDialog
├── OptionalCosts
├── PricingSummary
├── MobilePricingBar
└── QuoteReviewDialog
```

O mesmo conjunto deve ser usado na rota completa e no painel. A diferença deve
ser apenas o contêiner e a densidade, não a lógica ou os campos.

---

## Breakpoints

- `< 640 px`: mobile, uma coluna e barra inferior;
- `640–899 px`: tablet compacto, duas colunas apenas em campos curtos;
- `900–1199 px`: tablet/desktop, resumo abaixo ou lateral conforme espaço;
- `≥ 1200 px`: duas colunas com resumo sticky;
- `≥ 1536 px`: limitar largura; não esticar campos indefinidamente.

Não basear decisões somente em nomes de dispositivos; testar larguras reais.

---

## Ordem de implementação visual

1. Aplicar tokens de cor, contraste e tipografia.
2. Criar o layout desktop de duas colunas.
3. Criar cartões recolhíveis de bandeja.
4. Substituir `select` do tipo por controle segmentado.
5. Criar modal/painel de filamento.
6. Criar resumo financeiro hierárquico.
7. Criar barra fixa e bottom sheet mobile.
8. Criar revisão antes de salvar.
9. Implementar foco no primeiro erro e mensagens por campo.
10. Testar teclado, toque, contraste e redução de movimento.
11. Validar em 320, 375, 430, 768, 1024, 1280 e 1440 px.
12. Fazer QA visual com projetos de uma bandeja, multipartes e multicolor.

---

## Critérios de aceite visual

- É possível preencher uma bandeja de cor única no celular sem zoom ou rolagem
  horizontal.
- É possível adicionar filamento manual sem exibir cinco campos o tempo todo.
- O resultado principal está acessível em qualquer posição da página.
- Bandejas completas podem ser recolhidas e continuam identificáveis.
- Nenhum texto operacional importante usa menos de 12 px.
- Erros indicam exatamente o campo e a bandeja.
- Estoque insuficiente é visível, mas não impede salvar orçamento.
- Custos opcionais começam zerados e recolhidos.
- Calculadora completa e painel apresentam os mesmos campos e resultados.
- A tela permanece legível com cinco bandejas e quatro filamentos por bandeja.
- Ações destrutivas nunca ficam coladas à ação principal.
- O usuário entende que salvar orçamento não movimenta estoque.
