# 02 — Arquitetura: Como as partes do projeto conversam

## O mapa de pastas

```
INOVAPRO3D/
├── server.ts              ← Servidor Express (pagamentos, Telegram, proxy)
├── api/                   ← Versões serverless dos endpoints (para Vercel)
│   ├── model-metadata.ts  ← Importa título/descrição/fotos de links de modelos
│   └── _modelMetadata.ts  ← A lógica de fato (compartilhada com server.ts)
├── firestore.rules        ← Regras de segurança do banco de dados
├── storage.rules          ← Regras de segurança dos arquivos/imagens
├── vercel.json            ← Configuração do deploy na Vercel
├── vite.config.ts         ← Configuração do empacotador
├── .env                   ← Chaves e segredos (NUNCA vai pro GitHub)
│
└── src/                   ← TODO o código do site
    ├── main.tsx           ← Ponto de partida: liga o React
    ├── App.tsx            ← Define as rotas (URLs) e a estrutura geral
    │
    ├── pages/             ← As PÁGINAS (uma por URL)
    │   ├── public/        ← Home, Catálogo, Produto, Checkout, Calculadora...
    │   └── admin/         ← Painel administrativo
    │       ├── AdminDashboard.tsx   ← O "maestro" do admin (estado + lógica)
    │       └── components/          ← Os 18 painéis (Produtos, Pedidos, CRM...)
    │
    ├── components/        ← Componentes REUTILIZÁVEIS
    │   ├── layout/        ← Navbar, Footer, Carrinho lateral
    │   ├── ui/            ← Botão, ProductCard, Visualizador 3D...
    │   ├── auth/          ← ProtectedRoute (porteiro das rotas)
    │   ├── checkout/      ← Formulário de pagamento Stripe
    │   └── seo/           ← Meta tags por página (Google/compartilhamento)
    │
    ├── contexts/          ← ESTADO GLOBAL (dados compartilhados entre telas)
    │   ├── AuthContext    ← Quem está logado? É admin?
    │   ├── CartContext    ← O que tem no carrinho?
    │   └── ThemeContext   ← Tema claro ou escuro?
    │
    ├── services/
    │   └── firebase.ts    ← Conexão com o Firebase (auth, banco, storage)
    │
    ├── lib/               ← Funções utilitárias
    │   ├── pricing.ts     ← TODA a matemática de precificação 3D
    │   ├── config.ts      ← WhatsApp e e-mail de contato
    │   ├── stripe.ts      ← Configuração visual do Stripe
    │   ├── adminHelpers.tsx ← Formatação de títulos, conversão de imagens, tradução
    │   ├── modelCache.ts  ← Cache de modelos 3D no navegador
    │   └── utils.ts       ← Função cn() para juntar classes CSS
    │
    └── types/
        └── domain.ts      ← Os "contratos" de dados: o que é um Produto, Pedido, etc.
```

## Conceito-chave 1: Contexts (estado global)

Imagine que o carrinho de compras precisa aparecer na Navbar, no Catálogo e no Checkout.
Em vez de cada tela ter sua própria cópia, existe **uma única fonte da verdade**: o `CartContext`.

```
                    ┌──────────────┐
                    │ CartContext  │  ← guarda os itens (e salva no navegador)
                    └──────┬───────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Navbar          Catálogo         Checkout
   (mostra contador) (botão adicionar) (lista e cobra)
```

Os três contexts do projeto:

| Context | Guarda | Persiste onde |
|---|---|---|
| `AuthContext` | Usuário logado + perfil (papel: CUSTOMER/ADMIN) | Firebase cuida sozinho |
| `CartContext` | Itens do carrinho | `localStorage` do navegador (sobrevive a F5) |
| `ThemeContext` | Tema claro/escuro | `localStorage` |

## Conceito-chave 2: A hierarquia de "provedores"

No `App.tsx`, os contexts se aninham como bonecas russas. Quem está dentro pode usar o que está fora:

```
HelmetProvider (SEO)
 └─ ThemeProvider (tema)
     └─ Router (URLs)
         └─ AuthProvider (login)
             └─ CartProvider (carrinho)
                 └─ Páginas + Navbar + Footer
```

## Conceito-chave 3: Rotas e proteção

O `App.tsx` mapeia cada URL para uma página:

| URL | Página | Proteção |
|---|---|---|
| `/` | Home | Pública |
| `/catalogo` | Catálogo | Pública |
| `/produto/:id` | Detalhe do produto | Pública |
| `/calculadora` | Calculadora de filamento | Pública |
| `/checkout` | Finalizar compra | Pública (pede login pra concluir) |
| `/conhecimento` | Central de ajuda/FAQ | Pública |
| `/meus-pedidos` | Pedidos do cliente | 🔒 Precisa estar logado |
| `/admin` | Painel administrativo | 🔒🔒 Precisa ser ADMIN |

O **`ProtectedRoute`** é o porteiro: verifica no `AuthContext` se a pessoa está logada
(e se é admin, quando exigido). Se não estiver, redireciona para a Home.

**Como alguém vira admin?** O papel (`role`) fica gravado no banco, no documento
`users/{id-do-usuário}`. Todo mundo nasce como `CUSTOMER`; mudar para `ADMIN`
é feito manualmente no console do Firebase.

## Conceito-chave 4: O fluxo de uma compra (ponta a ponta)

```
1. Cliente navega no Catálogo
   └→ Catalog.tsx busca produtos no Firestore (coleção "products")

2. Clica num produto → ProductDetail.tsx
   └→ busca o produto + materiais + carrega o modelo 3D (com cache)

3. "Adicionar ao carrinho"
   └→ CartContext.addItem() → salva no localStorage

4. Vai pro /checkout
   └→ Preenche endereço (CEP busca automático no ViaCEP)
   └→ Cria o pedido no Firestore (coleção "orders", status PENDING_PAYMENT)

5. Pagamento
   ├─ Stripe: o site chama POST /api/stripe/create-payment-intent
   │   └→ o servidor cria a cobrança e devolve um "clientSecret"
   │   └→ o cliente paga (cartão ou PIX) direto com o Stripe
   │   └→ o Stripe avisa o servidor via webhook → status vira PAID
   │   └→ Telegram te notifica ✅
   └─ PIX manual: mostra QR code, você confirma manualmente no admin

6. Cliente acompanha em /meus-pedidos
   └→ busca "orders" filtrando pelo userId dele

7. Você gerencia no /admin
   └→ atualiza status: FILA → FATIANDO → IMPRIMINDO → PRONTO → ENVIADO
```

## Conceito-chave 5: O painel admin

O `AdminDashboard.tsx` é o **maestro**: ele carrega todos os dados (pedidos, produtos,
orçamentos...) e guarda todo o estado. Os 18 componentes em `admin/components/` são os
**músicos**: cada um só desenha sua tela e avisa o maestro quando o usuário clica em algo.

```
AdminDashboard.tsx (estado + lógica + chamadas ao banco)
 ├── AdminSidebar        (menu lateral)
 ├── AdminOverviewPanel  (visão geral + gráficos)
 ├── AdminProductsPanel  (catálogo: produtos, lote, mover de pasta)
 ├── AdminCategoriesPanel(pastas: capa, ordem, ativar/ocultar)
 ├── AdminOrdersPanel    (pedidos + Kanban de produção)
 ├── AdminQuotesPanel    (orçamentos)
 ├── AdminCRMPanel       (clientes)
 ├── AdminSupportPanel   (tickets de suporte)
 ├── AdminFAQPanel, AdminShowcasePanel, AdminMaterialsPanel,
 ├── AdminSettingsPanel, AdminLogsPanel...
 └── ConfirmDialog       (caixa de confirmação reutilizável)
```

Essa separação é **boa prática** ✅ — mas o maestro ficou grande demais
(~1.760 linhas). A doc 06 explica como dividir.

## Conceito-chave 6: O servidor Express (server.ts)

| Endpoint | O que faz |
|---|---|
| `POST /api/stripe/create-payment-intent` | Cria uma cobrança no Stripe |
| `POST /api/stripe/webhook` | Recebe a confirmação de pagamento do Stripe |
| `POST /api/notify/new-order` | Manda mensagem no seu Telegram |
| `GET /api/model-metadata?url=...` | Importa título/fotos de um link do MakerWorld/Bambu |
| `GET /api/proxy-image?url=...` | Baixa imagem externa para o navegador converter em WebP |
| `GET /api/health` | Verifica se o servidor está vivo |

## Serviços externos que o projeto consome

| Serviço | Usado para | De onde |
|---|---|---|
| Firebase (Google) | Login, banco, imagens | Todo o frontend |
| Stripe | Pagamentos | server.ts + Checkout |
| Telegram | Notificações pra você | server.ts |
| ViaCEP | Buscar endereço pelo CEP | Checkout |
| MyMemory | Traduzir descrições EN→PT na importação | adminHelpers + api/ |
| Bambu Lab API | Metadados de modelos do MakerWorld | api/_modelMetadata.ts |
| QR Server | Gerar QR code do PIX manual | MyOrders |
