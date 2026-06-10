# 03 — Banco de Dados: Onde tudo fica guardado

## Como funciona o Firestore

O Firestore organiza dados em **coleções** (gavetas) que contêm **documentos** (fichas).
Cada documento é um conjunto de campos, tipo uma ficha de cadastro.

```
Firestore (o arquivo geral)
 ├── products (gaveta)
 │    ├── abc123 (ficha) → { name: "Vaso Espiral", basePrice: 49.9, ... }
 │    └── def456 (ficha) → { name: "Suporte Fone", basePrice: 29.9, ... }
 ├── orders (gaveta)
 │    └── xyz789 (ficha) → { userId: "...", total: 79.8, status: "PAID", ... }
 └── ...
```

## Todas as coleções do projeto

### 🛍️ Loja

| Coleção | Guarda | Quem escreve | Quem lê |
|---|---|---|---|
| `products` | Produtos do catálogo: nome, descrição, preço, fotos, categoria, estoque, modelo 3D | Admin | Todo mundo (catálogo é público) |
| `categories` | As **pastas** do catálogo: nome, capa, ordem, ativa/oculta | Admin | Todo mundo |
| `materials` | Filamentos: PLA, PETG... com cor e preço | Admin | Todo mundo |
| `showcase` | Banner rotativo da Home/Catálogo | Admin | Todo mundo |
| `coupons` | Cupons de desconto | Admin | ⚠️ Todo mundo (problema! veja doc 05) |

### 📦 Vendas

| Coleção | Guarda | Quem escreve | Quem lê |
|---|---|---|---|
| `orders` | Pedidos: itens, total, endereço, status, rastreio | Cliente cria; admin atualiza | Cliente vê os seus; admin vê todos |
| `quotes` | Orçamentos personalizados: arquivo, material, peso, preço estimado | Cliente cria; admin gerencia | Cliente vê os seus; admin vê todos |

**Status de um pedido** (a "esteira" de produção):
```
PENDING_PAYMENT → PAID → QUEUE → SLICING → PRINTING
                → FINISHING → READY → SHIPPED → COMPLETED
   (ou CANCELED a qualquer momento)
```

### 👥 Pessoas

| Coleção | Guarda | Detalhe importante |
|---|---|---|
| `users` | Perfil de cada usuário logado: nome, e-mail, foto, **papel** (role) | O campo `role` define quem é ADMIN. Criado automaticamente no 1º login como CUSTOMER |
| `customers` | CRM: clientes com tags, telefone, anotações | Só admin acessa |
| `newsletter` | E-mails inscritos no rodapé do site | Qualquer um pode se inscrever |

### 🛠️ Operação

| Coleção | Guarda |
|---|---|
| `tickets` | Pedidos de suporte enviados pelos clientes |
| `faqs` | Perguntas frequentes da Central de Ajuda |
| `settings` | Configurações globais (frete fixo, banner promo, modo manutenção) |
| `logs` | Trilha de auditoria: o que cada admin fez e quando |
| `savedCalculations` | Cálculos salvos da calculadora de filamento |
| `system` | Documento `health` usado só pra testar a conexão |

## O arquivo de "contratos": types/domain.ts

Esse arquivo define **a forma exata** de cada dado. Exemplo real:

```typescript
export interface Product {
  id: string;            // identificador único
  name: string;          // nome do produto
  description: string;   // descrição
  basePrice: number;     // preço base em reais
  images: string[];      // lista de URLs das fotos
  category: string;      // em qual pasta está
  active?: boolean;      // visível no site? (o "?" = campo opcional)
  stock?: number;        // quantas unidades
  modelUrl?: string;     // arquivo 3D para o visualizador
  // ...
}
```

**Por que isso importa:** se alguém tentar salvar um produto sem nome, ou com preço
em texto em vez de número, o TypeScript acusa o erro **antes** de o site quebrar.
É a sua rede de proteção.

## Firebase Storage (os arquivos)

Imagens não ficam no Firestore — ficam no **Storage**, organizadas em pastas:

```
storage/
 ├── products/          ← fotos de produtos
 │    └── imports/      ← imagens importadas e convertidas pra WebP
 ├── categories/covers/ ← capas das pastas do catálogo
 └── showcase/          ← imagens do banner
```

Regras: qualquer um pode **ver** (são fotos da loja), só admin pode **enviar**,
só aceita **imagens** de até **10 MB**.

## As regras de segurança (firestore.rules)

O arquivo `firestore.rules` é o **segurança da boate**: decide quem entra onde.
Funciona mesmo que alguém tente burlar o site e falar direto com o banco.

As quatro perguntas que ele faz:

```
isSignedIn()  → a pessoa está logada?
isOwner(id)   → ela é dona desse dado? (ex: o pedido é dela?)
isAdmin()     → o papel dela no banco é "ADMIN"?
```

Exemplo traduzido para português:
> "Qualquer um pode LER produtos. Só admin pode CRIAR/EDITAR/APAGAR produtos."
> "Um cliente só pode LER os pedidos onde o userId é o dele. Admin lê todos."

⚠️ Existem dois pontos fracos nessas regras hoje — explicados na doc **05-SEGURANCA.md**.
