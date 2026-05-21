# Fase 0: Arquitetura e Setup Inicial

Esta fase estabelece a infraestrutura técnica robusta necessária para suportar operações de e-commerce e processamento de arquivos 3D.

## 🛠️ Detalhamento Técnico

### 1. Configuração Firebase (Master Data Source)
- **Firestore Collections:**
    - `users`: `{ name, email, phone, role, loyaltyPoints, addresses: [] }`
    - `products`: `{ name, categoryId, basePrice, images, modelUrl, dimensions, active }`
    - `materials`: `{ name, pricePerCm3, density, active, colors: [{ name, hex, available }] }`
    - `orders`: `{ userId, status, items: [], total, paymentId, trackingCode, createdAt }`
    - `quotes`: `{ userId, fileUrl, status, proposedPrice, adminNotes }`
    - `stock`: `{ materialId, colorId, weightTotalG, weightUsedG, lowStockAlert }`
- **Firebase Auth:** Habilitar provedor Google. Configurar persistência de sessão.
- **Firebase Storage:**
    - `/products/`: Imagens do catálogo.
    - `/custom-orders/`: Arquivos STL/OBJ enviados por clientes.
    - `/order-proofs/`: Fotos de peças prontas tiradas pelo admin.

### 2. Servidor Express (Proxy & Logic)
- **Middleware:** `express.json()`, `cors()`.
- **Rotas de API:**
    - `POST /api/payment/create`: Interface com SDK do Mercado Pago.
    - `POST /api/payment/webhook`: Captura notificações de pagamento aprovado do MP.
    - `POST /api/shipping/calculate`: Proxy para cálculo de frete (evitando exposição de chaves).
    - `POST /api/quotes/analyze`: (Opcional) Script Node para leitura básica de cabeçalho STL e extração de volume/dimensões.

### 3. Estruturação de Pastas (React/Vite)
```text
src/
├── components/
│   ├── ui/             # Shadcn-like components (Button, Input, Badge)
│   ├── layout/         # Navbar, Footer, AdminSidebar
│   ├── shared/         # PriceCalculator, ModelViewer3D
│   └── forms/          # Hook-form schemas para checkout e login
├── hooks/              # useAuth, useCart, useFirestore
├── services/           # firebase.ts, api.ts (axios/fetch)
├── contexts/           # CartContext, AuthContext
├── pages/              # Home, Catalog, AdminDashboard, etc.
└── utils/              # formatters.ts, math3d.ts
```

### 4. Design System (Tailwind)
- **Paleta de Cores:** Estilo "Dark Industrial".
- **Tipografia:** Syne (Heading) e DM Sans (Body).

## 📌 Checkpoint de Conclusão
- Executar `set_up_firebase`.
- Criar `firebase-applet-config.json`.
- Testar conexão inicial com Firestore.
