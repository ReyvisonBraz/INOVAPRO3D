# PROMPT COMPLETO — SITE DE IMPRESSÃO 3D
> Cole este prompt no Cline, Cursor, Claude Code ou qualquer IA de codificação.

---

## CONTEXTO DO PROJETO

Construa um sistema web completo para um serviço de impressão 3D sob demanda no Brasil. O sistema tem duas partes:

1. **Site público** — onde clientes descobrem, configuram e compram impressões 3D
2. **Painel Admin** — onde o operador gerencia pedidos, produção, estoque e finanças

---

## STACK TÉCNICA

```
Framework:     Next.js 14 (App Router)
Linguagem:     TypeScript
Estilo:        Tailwind CSS
Banco de dados: Supabase (PostgreSQL)
ORM:           Prisma
Autenticação:  NextAuth.js v5
Storage:       Supabase Storage (arquivos STL/OBJ, fotos de peças)
Pagamentos:    Mercado Pago (PIX, cartão, boleto)
WhatsApp:      Z-API ou Evolution API
Email:         Resend
Viewer 3D:     Three.js ou model-viewer web component
Deploy:        Vercel
```

---

## IDENTIDADE VISUAL

```
Nome do negócio: [NOME_DA_EMPRESA] — substitua conforme necessário
Paleta principal:
  --primary:    #FF6B00  (laranja vibrante — tecnologia + criatividade)
  --primary-dk: #CC5500
  --dark:       #0A0A0F  (fundo escuro)
  --surface:    #14141C
  --surface-2:  #1E1E2E
  --border:     #2A2A3E
  --text:       #F0F0F5
  --text-muted: #8888AA
  --success:    #00D4AA
  --warning:    #FFB800
  --danger:     #FF4466

Fontes:
  Display:  'Syne' (Google Fonts) — títulos e destaques
  Body:     'DM Sans' (Google Fonts) — corpo e UI
  Mono:     'JetBrains Mono' — valores, códigos de pedido

Estilo geral: dark-first, tech-industrial, bordas nítidas, sem gradientes
genéricos. Cards com borda sutil colorida no topo. Tabelas zebradas.
Badges com cores semânticas. Animações suaves em hover/focus.
```

---

## BANCO DE DADOS — SCHEMA PRISMA

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USUÁRIOS ───────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  phone         String?
  emailVerified DateTime?
  image         String?
  role          Role      @default(CUSTOMER)
  loyaltyPoints Int       @default(0)
  creditBalance Float     @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  addresses Address[]
  orders    Order[]
  quotes    Quote[]
  sessions  Session[]
  accounts  Account[]
}

enum Role {
  CUSTOMER
  ADMIN
  OPERATOR
}

model Address {
  id         String  @id @default(cuid())
  userId     String
  label      String  @default("Casa")
  street     String
  number     String
  complement String?
  district   String
  city       String
  state      String
  zipCode    String
  isDefault  Boolean @default(false)

  user   User    @relation(fields: [userId], references: [id])
  orders Order[]
}

// ─── CATÁLOGO ────────────────────────────────────────────────────────────────

model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  imageUrl    String?
  active      Boolean   @default(true)
  sortOrder   Int       @default(0)
  products    Product[]
}

model Material {
  id          String   @id @default(cuid())
  name        String   // PLA, PETG, ABS, TPU, Resina, etc.
  description String?
  pricePerCm3 Float    // preço base por cm³
  density     Float    // g/cm³ para cálculo de peso
  colors      Color[]
  active      Boolean  @default(true)
}

model Color {
  id         String   @id @default(cuid())
  materialId String
  name       String
  hex        String
  available  Boolean  @default(true)
  material   Material @relation(fields: [materialId], references: [id])
}

model Product {
  id           String   @id @default(cuid())
  categoryId   String
  name         String
  slug         String   @unique
  description  String
  basePrice    Float    // preço base (catálogo pronto)
  images       String[] // URLs Supabase Storage
  modelFileUrl String?  // arquivo STL/OBJ de referência
  widthMm      Float?
  heightMm     Float?
  depthMm      Float?
  weightG      Float?
  volumeCm3    Float?
  printTimeH   Float?   // tempo estimado de impressão em horas
  active       Boolean  @default(true)
  featured     Boolean  @default(false)
  createdAt    DateTime @default(now())

  category       Category        @relation(fields: [categoryId], references: [id])
  orderItems     OrderItem[]
  finishings     ProductFinishing[]
}

model Finishing {
  id          String   @id @default(cuid())
  name        String   // Lixado, Pintado, Primer, Sem acabamento
  description String?
  priceAdd    Float    @default(0) // valor adicional fixo
  active      Boolean  @default(true)

  products ProductFinishing[]
}

model ProductFinishing {
  productId   String
  finishingId String
  product     Product   @relation(fields: [productId], references: [id])
  finishing   Finishing @relation(fields: [finishingId], references: [id])

  @@id([productId, finishingId])
}

// ─── PEDIDOS ─────────────────────────────────────────────────────────────────

model Order {
  id            String      @id @default(cuid())
  readableId    String      @unique // #0001, #0002...
  userId        String
  addressId     String?
  status        OrderStatus @default(PENDING_PAYMENT)
  type          OrderType   @default(CATALOG)

  subtotal      Float
  shippingCost  Float       @default(0)
  discount      Float       @default(0)
  total         Float

  paymentMethod String?     // pix, credit_card, boleto
  paymentStatus PaymentStatus @default(PENDING)
  paymentId     String?     // ID Mercado Pago

  shippingMethod  String?
  trackingCode    String?
  estimatedDelivery DateTime?

  notes         String?     // observações do cliente
  internalNotes String?     // notas internas (admin)
  printerId     String?     // impressora alocada

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  user      User        @relation(fields: [userId], references: [id])
  address   Address?    @relation(fields: [addressId], references: [id])
  items     OrderItem[]
  history   OrderHistory[]
  printer   Printer?    @relation(fields: [printerId], references: [id])
}

enum OrderStatus {
  PENDING_PAYMENT    // aguardando pagamento
  PAID               // pago — aguardando análise
  IN_ANALYSIS        // analisando arquivo/pedido
  PRINTING           // em impressão
  POST_PROCESSING    // acabamento / pós-processamento
  QUALITY_CHECK      // controle de qualidade
  READY_TO_SHIP      // pronto para envio
  SHIPPED            // enviado
  DELIVERED          // entregue
  CANCELLED          // cancelado
  REFUNDED           // reembolsado
}

enum OrderType {
  CATALOG    // produto do catálogo
  CUSTOM     // arquivo enviado pelo cliente
}

enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
  REFUNDED
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productId   String?
  customFileUrl String?  // arquivo STL enviado (pedido personalizado)

  name        String
  materialId  String?
  colorId     String?
  finishingId String?
  quantity    Int
  unitPrice   Float
  totalPrice  Float

  widthMm     Float?
  heightMm    Float?
  depthMm     Float?
  scaleFactor Float?  @default(1.0)
  infillPct   Int?    @default(20)  // % de preenchimento
  notes       String?

  photoUrl    String? // foto da peça pronta (admin faz upload)

  order   Order    @relation(fields: [orderId], references: [id])
  product Product? @relation(fields: [productId], references: [id])
}

model OrderHistory {
  id        String      @id @default(cuid())
  orderId   String
  status    OrderStatus
  message   String?
  createdBy String?     // userId ou "system"
  createdAt DateTime    @default(now())

  order Order @relation(fields: [orderId], references: [id])
}

// ─── ORÇAMENTOS PERSONALIZADOS ───────────────────────────────────────────────

model Quote {
  id          String      @id @default(cuid())
  readableId  String      @unique
  userId      String?
  name        String?     // se não logado
  email       String?
  phone       String?
  fileUrl     String      // STL/OBJ enviado
  fileName    String
  fileSize    Int
  description String?
  materialId  String?
  colorId     String?
  finishingId String?
  quantity    Int         @default(1)
  status      QuoteStatus @default(PENDING)
  proposedPrice Float?
  adminNotes  String?
  expiresAt   DateTime?
  createdAt   DateTime    @default(now())

  user User? @relation(fields: [userId], references: [id])
}

enum QuoteStatus {
  PENDING      // aguardando análise
  ANALYZING    // em análise
  SENT         // proposta enviada
  APPROVED     // cliente aprovou
  REJECTED     // cliente recusou
  EXPIRED      // expirou
  CONVERTED    // virou pedido
}

// ─── IMPRESSORAS ─────────────────────────────────────────────────────────────

model Printer {
  id           String        @id @default(cuid())
  name         String        // ex: "Bambu Lab P1S #1"
  model        String
  technology   String        // FDM, SLA, SLS
  buildX       Float         // volume de impressão mm
  buildY       Float
  buildZ       Float
  status       PrinterStatus @default(IDLE)
  currentJobId String?
  totalHours   Float         @default(0)
  lastMaintenance DateTime?
  notes        String?

  orders Order[]
  maintenance PrinterMaintenance[]
}

enum PrinterStatus {
  IDLE
  PRINTING
  MAINTENANCE
  OFFLINE
}

model PrinterMaintenance {
  id          String   @id @default(cuid())
  printerId   String
  type        String   // limpeza, troca de bico, calibração
  description String?
  cost        Float?
  performedAt DateTime @default(now())
  printer     Printer  @relation(fields: [printerId], references: [id])
}

// ─── ESTOQUE DE FILAMENTOS ───────────────────────────────────────────────────

model FilamentStock {
  id           String   @id @default(cuid())
  materialId   String
  colorId      String?
  brand        String?
  weightTotalG Int      // peso total da bobina em g
  weightUsedG  Int      @default(0)
  batchCode    String?
  supplier     String?
  costPer100g  Float?
  purchasedAt  DateTime?
  lowStockAlert Int     @default(200) // alerta quando < Xg restando
  active       Boolean  @default(true)
}

// ─── CUPONS / PROMOÇÕES ──────────────────────────────────────────────────────

model Coupon {
  id           String     @id @default(cuid())
  code         String     @unique
  type         CouponType
  value        Float      // % ou R$
  minOrderValue Float?
  maxUses      Int?
  usedCount    Int        @default(0)
  validFrom    DateTime   @default(now())
  validUntil   DateTime?
  active       Boolean    @default(true)
}

enum CouponType {
  PERCENT
  FIXED
  FREE_SHIPPING
}

// ─── NEXTAUTH ────────────────────────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

---

## ESTRUTURA DE PASTAS

```
src/
├── app/
│   ├── (public)/               ← site público
│   │   ├── page.tsx            ← Home/Landing
│   │   ├── catalogo/
│   │   │   ├── page.tsx        ← listagem
│   │   │   └── [slug]/page.tsx ← produto individual
│   │   ├── calculadora/page.tsx
│   │   ├── upload/page.tsx     ← orçamento personalizado
│   │   ├── portfolio/page.tsx
│   │   ├── como-funciona/page.tsx
│   │   ├── checkout/
│   │   │   ├── page.tsx
│   │   │   └── sucesso/page.tsx
│   │   ├── rastrear/[id]/page.tsx
│   │   └── conta/
│   │       ├── pedidos/page.tsx
│   │       ├── arquivos/page.tsx
│   │       └── perfil/page.tsx
│   │
│   ├── admin/                  ← painel admin (role: ADMIN/OPERATOR)
│   │   ├── layout.tsx
│   │   ├── page.tsx            ← Dashboard
│   │   ├── pedidos/
│   │   │   ├── page.tsx        ← lista/kanban
│   │   │   └── [id]/page.tsx   ← detalhes
│   │   ├── orcamentos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── catalogo/
│   │   │   ├── page.tsx
│   │   │   ├── novo/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── impressoras/page.tsx
│   │   ├── estoque/page.tsx
│   │   ├── financeiro/page.tsx
│   │   └── configuracoes/page.tsx
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── orders/route.ts
│       ├── orders/[id]/route.ts
│       ├── orders/[id]/status/route.ts
│       ├── quotes/route.ts
│       ├── quotes/[id]/route.ts
│       ├── products/route.ts
│       ├── calculator/route.ts
│       ├── upload/route.ts
│       ├── payment/webhook/route.ts
│       ├── payment/create/route.ts
│       ├── shipping/calculate/route.ts
│       └── notifications/whatsapp/route.ts
│
├── components/
│   ├── ui/                     ← componentes base (Button, Input, Badge, etc.)
│   ├── public/                 ← componentes do site público
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductViewer3D.tsx
│   │   ├── PriceCalculator.tsx
│   │   ├── OrderTracker.tsx
│   │   └── UploadZone.tsx
│   └── admin/                  ← componentes do painel
│       ├── AdminSidebar.tsx
│       ├── OrderKanban.tsx
│       ├── StatsCard.tsx
│       └── FilamentStockBar.tsx
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── mercadopago.ts
│   ├── whatsapp.ts
│   ├── resend.ts
│   ├── supabase.ts
│   ├── calculator.ts           ← lógica de precificação
│   └── shipping.ts             ← cálculo de frete (ViaCEP + transportadora)
│
└── types/
    └── index.ts
```

---

## PÁGINAS — ESPECIFICAÇÃO DETALHADA

---

### 1. HOME / LANDING PAGE (`/`)

**Hero section:**
- Headline impactante: ex. "Sua ideia. Em 3 dimensões."
- Sub: prazo de entrega + materiais disponíveis
- CTA duplo: "Ver catálogo" + "Enviar meu arquivo"
- Background: vídeo/gif de impressão 3D em loop ou animação de partículas
- Badge flutuante: "✓ Entrega em todo o Brasil"

**Seção "Como funciona" (3 passos animados):**
1. Escolha ou envie seu modelo
2. Selecione material, cor e acabamento
3. Receba em casa

**Seção materiais disponíveis:**
- Cards horizontais com cada material (PLA, PETG, ABS, TPU, Resina)
- Ícone, nome, descrição curta, casos de uso, preço base por cm³

**Galeria / Portfolio:**
- Grid masonry com fotos reais de peças impressas
- Filtro por categoria
- Hover: nome do projeto + material usado

**Calculadora rápida (preview):**
- Widget inline simples: seleciona material + tamanho aproximado → mostra estimativa
- Botão "Calcular com precisão →" leva para `/calculadora`

**Depoimentos:**
- Cards com foto, nome, cidade, nota (estrelas), texto
- Carrossel automático

**CTA final:**
- Banner full-width: "Pronto para imprimir?"
- Botões: catálogo + upload

**Stats animados:**
- Ex: "2.847 peças impressas", "98% de satisfação", "47 materiais e cores"

---

### 2. CATÁLOGO / LOJA (`/catalogo`)

**Filtros sidebar (desktop) / drawer (mobile):**
- Categoria (checkboxes)
- Material (checkboxes)
- Cor disponível (swatches visuais)
- Faixa de preço (slider range)
- Acabamento disponível
- Ordenação: relevância, menor preço, maior preço, mais recente, mais vendido

**Grid de produtos:**
- Cards com: foto principal, nome, material badge, preço base, botão rápido
- Hover no card: mostra segunda foto / ângulo diferente
- Badge "Destaque", "Novo", "Mais vendido"
- Skeleton loading enquanto carrega

**Paginação infinita** (scroll) ou paginação numerada

**Busca full-text** na barra superior

---

### 3. PÁGINA DO PRODUTO (`/catalogo/[slug]`)

**Galeria:**
- Foto principal grande
- Miniaturas navegáveis
- Botão "Ver em 3D" → abre viewer Three.js / model-viewer

**Viewer 3D (se tiver arquivo STL):**
- Componente `<model-viewer>` ou Three.js
- Controles: rotacionar, zoom, pan
- Trocar cor em tempo real (troca o material do modelo)
- Botão fullscreen

**Configurador (painel lateral):**
```
Material:    [PLA ▼]    [PETG ▼]    [ABS ▼]    [TPU ▼]
Cor:         [swatches visuais — só cores disponíveis para o material]
Acabamento:  [Sem ▼] [Lixado ▼] [Pintado ▼]
Escala:      [100%] [slider 50%–200%]
Quantidade:  [- 1 +]
Notas:       [textarea]
```

**Preço em tempo real:**
- Atualiza conforme muda configurações
- Breakdown: material + acabamento + envio estimado
- Prazo estimado de produção

**Botão "Adicionar ao carrinho"** + "Comprar agora"

**Especificações técnicas:**
- Dimensões (L x A x P em mm)
- Peso aproximado (g)
- Volume (cm³)
- Tempo de impressão (h)
- Resistência, temperatura máxima suportada (por material)

**Produtos relacionados** (mesma categoria)

---

### 4. CALCULADORA DE PREÇOS (`/calculadora`)

**Modo 1: Por dimensões**
```
Largura (mm): [____]
Altura (mm):  [____]
Profundidade (mm): [____]
→ Volume calculado automaticamente: X cm³
```

**Modo 2: Upload STL** (análise automática de volume/peso)
```
[Arraste seu arquivo STL aqui]
→ Após upload: mostra dimensões e volume detectados
```

**Configurações comuns:**
```
Material:      [select]    → preço/cm³ carregado automaticamente
Cor:           [select]
Preenchimento: [20%] [slider 10%–100%]
Acabamento:    [select]    → adicional em R$
Quantidade:    [input]
```

**Painel de resultado (live, atualiza em tempo real):**
```
┌──────────────────────────────────┐
│ Estimativa de custo              │
├──────────────────────────────────┤
│ Volume:          X,XX cm³        │
│ Peso estimado:   X,Xg            │
│ Material (PLA):  R$ XX,XX        │
│ Acabamento:      R$ XX,XX        │
│ Produção:        ~X horas        │
│ Prazo estimado:  X–X dias úteis  │
├──────────────────────────────────┤
│ TOTAL ESTIMADO   R$ XXX,XX       │
│ (sem frete)                      │
└──────────────────────────────────┘
[Fazer pedido com estas configs →]
[Solicitar orçamento formal →]
```

**Fórmula de precificação (`lib/calculator.ts`):**
```typescript
const pricePerCm3 = material.pricePerCm3
const materialCost = volume * pricePerCm3 * (infill / 100)
const finishingCost = finishing.priceAdd
const setupFee = 5.00   // taxa fixa por pedido
const unitPrice = materialCost + finishingCost + setupFee
const totalPrice = unitPrice * quantity
```

---

### 5. UPLOAD PERSONALIZADO (`/upload`)

**Stepper em 3 etapas:**

**Etapa 1 — Arquivo:**
- Dropzone: aceita `.stl`, `.obj`, `.3mf`, `.step`, `.iges`
- Tamanho máximo: 50MB
- Progress bar de upload para Supabase Storage
- Após upload: preview 3D do arquivo (Three.js loader)
- Mostra dimensões detectadas automaticamente

**Etapa 2 — Configurações:**
- Todos os campos do configurador (material, cor, acabamento, escala, quantidade)
- Campo de descrição / observações
- Foto de referência opcional (o que o cliente quer alcançar)

**Etapa 3 — Contato e resumo:**
- Se logado: dados já preenchidos
- Se não logado: nome, email, telefone (WhatsApp)
- Resumo do pedido
- Botão "Enviar para orçamento"
- Ou "Comprar direto" se arquivo analisável automaticamente

**Após envio:**
- Página de confirmação com número do orçamento (#QT-0001)
- Info: "Você receberá a proposta em até 24h via WhatsApp e email"

---

### 6. CHECKOUT (`/checkout`)

**Carrinho:**
- Lista de itens com foto, nome, configurações, quantidade (editável), preço
- Remover item
- Aplicar cupom de desconto
- Sub-total, desconto, frete, total

**Endereço:**
- Se logado: selecionar endereço salvo ou adicionar novo
- ViaCEP: preenchimento automático por CEP

**Frete:**
- Cálculo por CEP
- Opções: PAC, Sedex, Transportadora (com prazo e preço)

**Pagamento:**
- PIX: gera QR code + código copia-cola + countdown 15min
- Cartão: form com Mercado Pago SDK (tokenização segura)
- Boleto: gera boleto PDF + linha digitável

**Confirmação:**
- Número do pedido (#0001)
- Resumo completo
- Info de prazo
- "Acompanhar pedido →"
- Envia email de confirmação (Resend)
- Envia WhatsApp de confirmação (Z-API)

---

### 7. RASTREAMENTO DE PEDIDO (`/rastrear/[id]`)

**Acessível sem login** via link enviado por WhatsApp/email

**Timeline visual de status:**
```
✅ Pedido confirmado        — 01/06 14:30
✅ Pagamento aprovado       — 01/06 14:35
✅ Em análise               — 02/06 09:00
🟠 Em impressão (atual)    — 03/06 08:00
○  Acabamento
○  Controle de qualidade
○  Pronto para envio
○  Enviado
○  Entregue
```

**Detalhes:**
- Foto do item (admin faz upload quando pronto)
- Código de rastreio dos Correios (quando enviado)
- Previsão de entrega

---

### 8. ÁREA DO CLIENTE (`/conta/*`)

**Meus pedidos:**
- Lista com status badge colorido, data, valor, ações
- Clique → detalhes + rastreamento
- Botão "Repetir pedido" (pré-preenche carrinho com mesmo pedido)

**Meus arquivos:**
- STL/OBJ enviados anteriormente
- Reaproveitar em novo pedido
- Download do arquivo

**Perfil:**
- Editar nome, email, telefone
- Endereços salvos (CRUD)
- Trocar senha

**Pontos de fidelidade:**
- Saldo de pontos
- Histórico de ganhos/resgates
- Regras do programa

---

## PAINEL ADMIN — ESPECIFICAÇÃO DETALHADA

**Rota base:** `/admin` — protegida por `role: ADMIN | OPERATOR`
**Layout:** sidebar fixa esquerda + topbar + conteúdo principal

---

### ADMIN 1 — DASHBOARD (`/admin`)

**Cards de KPIs (linha superior):**
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Pedidos    │ │ Receita    │ │ Em produção│ │ Fila de    │
│ hoje: 12   │ │ hoje: R$X  │ │ 8 itens    │ │ análise: 3 │
│ ↑15% vs    │ │ ↑8% vs     │ │            │ │            │
│ ontem      │ │ ontem      │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

**Gráfico de receita:** linha — últimos 30 dias (Recharts)

**Gráfico de pedidos por status:** barras ou donut

**Fila de produção resumida:**
- Tabela: Pedido # | Cliente | Itens | Impressora alocada | Status | Prazo
- Botão "Ver todos →"

**Alertas:**
- Filamentos com estoque crítico (< limiar)
- Pedidos há mais de 24h sem atualização
- Orçamentos aguardando análise
- Impressoras em manutenção

**Atividade recente:**
- Feed de eventos: novo pedido, pagamento aprovado, pedido enviado, etc.

---

### ADMIN 2 — GESTÃO DE PEDIDOS (`/admin/pedidos`)

**Dois modos de visualização (toggle):**

**Modo Lista:**
- Tabela com colunas: #ID | Data | Cliente | Itens | Total | Status | Impressora | Ações
- Filtros: status, tipo (catálogo/custom), data, impressora, busca por nome/ID
- Ordenação por qualquer coluna
- Exportar CSV

**Modo Kanban:**
```
[Aguardando Pgto] → [Pago/Análise] → [Imprimindo] → [Acabamento] → [Pronto] → [Enviado]
   Card Card          Card Card        Card Card       Card Card      Card       Card
```
- Card: #ID, cliente, itens resumidos, prazo, impressora badge
- Drag-and-drop entre colunas (muda status automaticamente)
- Clique no card → abre modal de detalhes

**Modal / Página de detalhes do pedido:**
```
Pedido #0043 — João Silva                    [Cancelar] [Imprimir etiqueta]

Status atual: EM IMPRESSÃO  [← Voltar status] [Avançar status →]

Itens:
┌──────────────────────────────────────────────────────────────┐
│ Foto  │ Nome            │ Config              │ Qtd │ Total  │
│ [img] │ Suporte p/ mesa │ PLA Preto / Lixado  │  2  │ R$48   │
│       │ [Upload foto ↑] │ 100% / Escala 1x    │     │        │
└──────────────────────────────────────────────────────────────┘

Impressora alocada: [Bambu Lab P1S #1 ▼]

Timeline de status:
  ✅ Pago — 01/06 14:35 (automático)
  ✅ Em análise — 02/06 09:00 (Carlos)
  🟠 Em impressão — 03/06 08:00 (Carlos)

Endereço de entrega: Rua X, 123 — São Paulo/SP — CEP 01234-000
Frete: Sedex — R$ 18,90

Notas do cliente: "Prefiro preto fosco se possível"
Notas internas: [textarea — apenas admin vê]

Pagamento: PIX — Aprovado — R$ 66,90
ID Mercado Pago: MP-XXXX

[Enviar mensagem WhatsApp ao cliente]
[Marcar como enviado + código de rastreio]
```

---

### ADMIN 3 — ORÇAMENTOS (`/admin/orcamentos`)

**Lista:** tabela com #ID, cliente, arquivo, data, status, valor proposto, ações

**Página do orçamento:**
- Preview 3D do arquivo enviado (Three.js)
- Dimensões detectadas
- Configurações solicitadas pelo cliente
- Campo: valor proposto (preenchido pelo admin)
- Campo: prazo estimado
- Campo: observações para o cliente
- Botão "Enviar proposta" → dispara WhatsApp + email com proposta
- Botão "Converter em pedido" (quando aprovado)
- Botão "Recusar" com campo de motivo

---

### ADMIN 4 — CATÁLOGO (`/admin/catalogo`)

**Lista de produtos:**
- Tabela: foto, nome, categoria, preço, status (ativo/inativo), ações
- Toggle ativo/inativo inline
- Filtro por categoria

**Formulário criar/editar produto:**
```
Nome:           [________________]
Slug:           [________________] (auto-gerado, editável)
Categoria:      [select]
Descrição:      [textarea rich text]
Preço base:     R$ [______]

Arquivo 3D:     [upload STL/OBJ]
Imagens:        [upload múltiplas — drag to reorder]

Dimensões:
  Largura: [__] mm  Altura: [__] mm  Profundidade: [__] mm
  Peso: [__] g   Volume: [__] cm³   Tempo impressão: [__] h

Acabamentos disponíveis: [multiselect checkboxes]

Materiais compatíveis: [multiselect]
  Para cada material: cores disponíveis [multiselect]

Destaque: [toggle]   Ativo: [toggle]
```

**Gestão de categorias e materiais** (sub-páginas ou abas)

---

### ADMIN 5 — CLIENTES (`/admin/clientes`)

**Lista:**
- Tabela: nome, email, telefone, total de pedidos, valor total gasto, data cadastro, ações
- Busca por nome/email/telefone
- Filtro: clientes com pedido ativo, novos (últimos 30d)

**Perfil do cliente:**
- Dados pessoais
- Histórico de pedidos (mesma tabela de pedidos filtrada)
- Total gasto, pedidos realizados, último pedido
- Créditos/pontos de fidelidade — ajuste manual
- Campo de observações internas
- Botão "Enviar WhatsApp"
- Botão "Bloquear cliente" (blacklist)

---

### ADMIN 6 — IMPRESSORAS (`/admin/impressoras`)

**Lista de impressoras:**
- Cards: foto, nome, modelo, tecnologia, status badge, trabalho atual, volume de construção
- Status: LIVRE (verde), IMPRIMINDO (amarelo), MANUTENÇÃO (vermelho), OFFLINE (cinza)

**Detalhes da impressora:**
- Pedido atual alocado (link)
- Total de horas de uso
- Histórico de manutenção
- Botão "Registrar manutenção" → modal com tipo, descrição, custo
- Volume de construção em mm

**Alocação:**
- Na página do pedido, admin seleciona qual impressora usará

---

### ADMIN 7 — ESTOQUE DE FILAMENTOS (`/admin/estoque`)

**Cards por filamento (material + cor):**
```
┌────────────────────────────────────┐
│ 🟧 PLA LARANJA                     │
│ Marca: Polymaker                   │
│ Restando: 650g de 1000g            │
│ [████████░░░] 65%                  │
│ Alerta em: < 200g                  │
│                          [Editar]  │
└────────────────────────────────────┘
```
- Barra de progresso colorida (verde → amarelo → vermelho)
- Ordenação: menor estoque primeiro
- Filtro por material / cor

**Adicionar/editar estoque:**
- Campos: material, cor, marca, peso total, peso usado, custo por 100g, fornecedor, lote, data compra
- Registrar uso: campo "descontar Xg" com pedido vinculado

**Relatório de consumo:**
- Gráfico: consumo por material nos últimos 30/60/90 dias
- Custo médio de material por pedido

---

### ADMIN 8 — FINANCEIRO (`/admin/financeiro`)

**Resumo do período (filtro: dia / semana / mês / personalizado):**
```
Receita bruta:    R$ X.XXX,XX
Descontos dados:  R$ XXX,XX
Frete recebido:   R$ XXX,XX
Custo filamento:  R$ XXX,XX (estimado pelo consumo)
Custo envio:      R$ XXX,XX
Lucro estimado:   R$ X.XXX,XX
Margem:           XX%
```

**Gráfico de receita x custo** — linha dupla (Recharts)

**Tabela de transações:**
- #Pedido | Data | Cliente | Subtotal | Frete | Desconto | Total | Método pagamento | Status

**Relatórios exportáveis:**
- CSV de transações do período
- Relatório de custo de produção por pedido

---

### ADMIN 9 — CONFIGURAÇÕES (`/admin/configuracoes`)

**Abas:**

**Precificação:**
- Taxa de setup fixa por pedido (R$)
- Margem mínima (%)
- Tabela de preço por material (editável inline)
- Regras de desconto por quantidade (ex: +10un = -5%)

**Prazos:**
- Prazo padrão de produção por material (dias úteis)
- Horário de corte (pedidos após 18h = próximo dia útil)

**Frete:**
- Integrações: Correios, Melhor Envio
- Frete grátis acima de R$: [input]
- Raio de entrega local (retirada grátis)

**Materiais e cores:**
- CRUD completo de materiais
- CRUD de cores por material

**Notificações:**
- Quais eventos disparam WhatsApp (checkboxes)
- Quais eventos disparam email
- Template de mensagem WhatsApp por evento (editável)

**Usuários admin:**
- Lista de admins/operadores
- Convidar novo usuário (por email)
- Definir papel: ADMIN ou OPERATOR

**Integrações:**
- Mercado Pago: MP_ACCESS_TOKEN (campo mascarado)
- Z-API: instance + token
- Resend: API key

---

## NOTIFICAÇÕES WHATSAPP (AUTOMÁTICAS)

Implementar em `lib/whatsapp.ts` usando Z-API:

```typescript
// Eventos que disparam mensagem:

// 1. Pedido confirmado (após pagamento aprovado)
`✅ *Pedido #${id} confirmado!*
Olá ${name}, recebemos seu pedido e já estamos preparando tudo.
📦 Itens: ${items}
💳 Total: R$ ${total}
⏱ Prazo estimado: ${prazo}
Acompanhe em: ${trackUrl}`

// 2. Em impressão
`🖨️ *Seu pedido está sendo impresso!*
Pedido #${id} entrou na fila de impressão.
Previsão de conclusão: ${date}`

// 3. Pronto para envio (com foto)
`📸 *Sua peça ficou incrível!*
[FOTO DA PEÇA]
Pedido #${id} está pronto e será enviado em breve.`

// 4. Enviado
`🚚 *Pedido enviado!*
Pedido #${id} foi despachado.
Rastreio: ${codigo}
Rastreie em: ${correiosUrl}`

// 5. Proposta de orçamento enviada
`💡 *Sua proposta de orçamento chegou!*
Orçamento #${id}: R$ ${valor}
Válido até: ${expiry}
Ver proposta: ${url}`
```

---

## REGRAS DE NEGÓCIO IMPORTANTES

```typescript
// IDs legíveis sequenciais
// Pedidos: #0001, #0002...
// Orçamentos: #QT-0001

// Cálculo de prazo de entrega
function calcDeadline(material: string, quantity: number): Date {
  const baseDays = { PLA: 2, PETG: 2, ABS: 3, TPU: 3, RESINA: 4 }
  const extraDays = Math.floor(quantity / 5)
  const productionDays = baseDays[material] + extraDays
  // Pula fins de semana e feriados
  return addBusinessDays(new Date(), productionDays)
}

// Pontos de fidelidade: 1 ponto a cada R$10 gastos
// 100 pontos = R$5 de desconto

// Desconto por quantidade:
// 5–9 unidades: -5%
// 10–19 unidades: -10%
// 20+ unidades: -15%

// Upload de arquivo STL: usar Three.js STLLoader para
// calcular volume automaticamente do bounding box
```

---

## VARIÁVEIS DE AMBIENTE (`.env`)

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=

ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=

RESEND_API_KEY=
EMAIL_FROM=noreply@seusite.com.br

NEXT_PUBLIC_SITE_URL=https://seusite.com.br
```

---

## ORDEM DE IMPLEMENTAÇÃO SUGERIDA

```
Fase 1 — Base
  ✅ Setup Next.js 14 + TypeScript + Tailwind + Prisma + Supabase
  ✅ Migrations do schema completo
  ✅ NextAuth.js configurado (email magic link + Google)
  ✅ Layout público (Navbar, Footer) + design system

Fase 2 — Catálogo e produto
  ✅ Página Home
  ✅ Catálogo com filtros
  ✅ Página do produto + configurador + preço em tempo real
  ✅ Calculadora de preços

Fase 3 — Compra
  ✅ Carrinho (Zustand ou context)
  ✅ Checkout com Mercado Pago (PIX primeiro)
  ✅ Webhook de pagamento
  ✅ Email de confirmação (Resend)

Fase 4 — Upload e orçamentos
  ✅ Página de upload STL
  ✅ Preview 3D com Three.js
  ✅ Sistema de orçamentos

Fase 5 — Área do cliente
  ✅ Dashboard do cliente
  ✅ Rastreamento de pedido
  ✅ Histórico + reordenar

Fase 6 — Admin base
  ✅ Layout admin + sidebar
  ✅ Dashboard com KPIs
  ✅ Gestão de pedidos (lista + kanban)
  ✅ Detalhes do pedido + troca de status

Fase 7 — Admin completo
  ✅ Orçamentos
  ✅ Catálogo (CRUD)
  ✅ Clientes
  ✅ Impressoras e estoque
  ✅ Financeiro

Fase 8 — Automações
  ✅ WhatsApp automático por status
  ✅ Alertas de estoque
  ✅ Programa de fidelidade
  ✅ Cupons de desconto
```

---

## NOTAS FINAIS PARA A IA DE CÓDIGO

- Use `// TODO: [DB]` onde faltar implementação de banco
- Use `// TODO: [API]` onde faltar chamada de API externa
- Use `// TODO: [WPP]` onde faltar integração WhatsApp
- Use `// TODO: [PAY]` onde faltar integração de pagamento
- Prefira `server actions` do Next.js 14 onde possível
- Implemente `loading.tsx` e `error.tsx` em todas as rotas
- Use `zod` para validação de formulários + API routes
- Use `react-hook-form` nos formulários
- Use `Recharts` para gráficos no admin
- Mantenha acessibilidade: aria-labels, foco visível, contraste correto
- Modo responsivo em todas as páginas (mobile-first)
