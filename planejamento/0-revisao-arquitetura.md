# Revisão: Fase 0 - Arquitetura, Segurança e Setup de Infraestrutura

Este documento apresenta uma auditoria estrutural e planejamento detalhado para a infraestrutura de backend, segurança de dados e configurações do servidor da **Inovalt 3D**. Ele descreve o estado atual da Fase 0 (Arquitetura), identifica o que precisa ser melhorado/resolvido e detalha as ações técnicas de evolução.

---

## 🔍 1. Auditoria da Infraestrutura Atual (Server & Banco)

```
       [ CLIENTE (SPA) ] ────── HTTPS / API ──────> [ EXPRESS SERVER (Port: 3000) ]
               │                                            │
         Firebase SDK                                 Mercado Pago API
               │                                      Melhor Envio API
               ▼                                            │
       [ FIRESTORE DB ] <─── Regras de Segurança (rules) ─────┘
```

### 🟢 O que já está funcionando (Estável)
* **Servidor Híbrido Express + Vite**: Nosso arquivo `server.ts` serve dinamicamente o compilado do React SPA (`dist/`) em produção e acopla o middleware de desenvolvimento do Vite (`createViteServer`) em ambiente de desenvolvimento.
* **Diagnósticos & Healthcheck**: Rota `/api/health` operacional para monitoramento do consumo de memória, timestamp do servidor e integridade operacional de contêineres.
* **Carregamento de Chaves Reativo**: Arquivo de configuração `.env` lido com maestria pelo servidor sem expor chaves sensíveis como `GEMINI_API_KEY` ou tokens bancários ao navegador.

### ❌ Lacunas Técnicas e Gaps de Infraestrutura
1. **Falta de Endpoints de Integração Física**: 
   - A rota de criação de faturamento Pix (`/api/payment/create`) e Webhooks (`/api/payment/webhook`) com o Mercado Pago não está implementada em `server.ts`.
   - O proxy de frete (`/api/shipping/calculate`) não possui o fluxo para requisições de CEP.
2. **Inexistência de Regras de Segurança no Firestore (Risco de Invasão)**:
   - A coleção `users`, `quotes` e `orders` precisam de regras estritas no `firestore.rules` impedindo que um usuário logado leia dados de faturamento ou projetos STL de outro usuário.
3. **Falta de Rotinas de Seeding (Dados Iniciais)**:
   - Se o banco de dados Firebase for provisionado limpo, materiais padrão (como PLA, ABS, TPU), configurações globais (markup %, custo do filamento) e categorias não são populados de forma guiada, causando telas em branco na primeira execução.

---

## 🛠️ 2. Plano de Melhorias e Evolução (Fase 0)

Para blindar a segurança e fornecer os serviços fundamentais ao e-commerce e faturamento de orçamentos, dividimos a evolução de arquitetura nos seguintes pilares:

### 🛡️ A. Evolução 1: Regras Estritas de Segurança (`firestore.rules`)
* **Ação**: Implementar regras robustas que garantam isolamento do cliente e controle total do administrador.
* **Especificação rules**:
  - `admin`: Qualquer usuário com o campo `role === "ADMIN"` na coleção `users` tem passe livre para ler e mudar qualquer coleção.
  - `users`: Usuário comum só pode ler e editar seu próprio documento (`request.auth.uid == userId`).
  - `quotes` e `orders`: Usuários comuns só enxergam/interagem se forem donos do documento (`request.auth.uid == resource.data.userId` ou `request.auth.uid == request.resource.data.userId`).
  - `products` e `materials`: Leitura pública livre para catálogo, gravação exclusiva por administradores.

### 🔌 B. Evolução 2: Endpoints Unificados de Integração (`server.ts`)
* **Ação**: Introduzir em `server.ts` os controladores e drivers de serviços para cálculo de frete e Mercado Pago de modo assíncrono e preguiçoso (*lazy-init*) para evitar falhas em startup caso as variáveis de produção ainda estejam ausentes.
* **Estrutura**:
  - `POST /api/payment/create`: Recebe `items`, email, e protocolo do cliente. Instancia a SDK do Mercado Pago temporariamente, gera o Pix e retorna o código Copia e Cola.
  - `POST /api/payment/webhook`: Trata as notificações do Mercado Pago de faturamento com segurança (criptografia MD5 opcional) e atualiza o estado de pagamento para `PAID` diretamente no Firestore por meio do Firebase Admin (ou webhook autenticado).
  - `POST /api/shipping/calculate`: Recebe o `cepDestino` e as dimensões físicas brutas para calcular o valor do frete e os dias úteis.

### 🌱 C. Evolução 3: Seeder Inteligente de Banco de Dados
* **Ação**: Criar rotinas no backend que interceptam a inicialização do Firestore. Se a coleção `materials` ou `globals` estiver vazia, injetará os materiais de modelagem padrão da Inovalt 3D (PLA Pro, TPU Termoplástico, ABS Industrial e PETG Ecológico).

---

## 🚀 3. Arquitetura da Solução Técnica

Abaixo está o detalhamento estrutural das propostas que serão injetadas para solidificar a infraestrutura:

### Matriz de Variáveis de Ambiente Necessárias (`.env.example`):
```env
# SERVER SECRETS & CREDENTIALS
PORT=3000
NODE_ENV=development

# FIREBASE SERVICE CONNECTION
FIREBASE_PROJECT_ID=inovalt-3d

# MERCADO PAGO INTEGRATION
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... # Token de produção do PIX

# FRETE INTEGRATION (CORREIOS / MELHOR ENVIO)
MELHOR_ENVIO_TOKEN=...
SHIPPER_ORIGIN_ZIP=01001000 # CEP de origem da fábrica física
```

### Arquitetura de Regras do Firestore (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para checar se o usuário é Administrador
    function isAdmin() {
      return request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }

    // Coleção de usuários / perfis
    match /users/{userId} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
    }

    // Catálogo de produtos e materiais
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /materials/{materialId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Pedidos transacionados
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
      allow update, delete: if isAdmin();
    }

    // Orçamentos personalizados STL
    match /quotes/{quoteId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
      allow update, delete: if isAdmin();
    }
  }
}
```

---

## 📊 4. Próxima Fase do Roteiro de Sprints

Aprovando o refinamento de infraestrutura da **Fase 0**, estaremos com as bases técnicas seguras, os tokens financeiros isolados de invasões e o processador Express pronto. 

Podemos passar para a revisão detalhada da **Fase 1: Interface & Autenticação (CRM Inicial)**! Como gostaria de prosseguir?
