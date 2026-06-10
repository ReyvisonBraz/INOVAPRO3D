# 01 — Visão Geral: O que é o projeto e do que ele é feito

## O que o projeto faz

O INOVAPRO3D é uma plataforma completa para operar um negócio de impressão 3D:

```
┌─────────────────────────────────────────────────────┐
│                    SITE PÚBLICO                     │
│  Home → Catálogo → Produto → Carrinho → Checkout    │
│  + Calculadora de filamento + Central de ajuda      │
├─────────────────────────────────────────────────────┤
│                  ÁREA DO CLIENTE                    │
│  Login com Google → Meus Pedidos (acompanhamento)   │
├─────────────────────────────────────────────────────┤
│                   PAINEL ADMIN                      │
│  Produtos · Pastas · Pedidos · Orçamentos · CRM     │
│  Suporte · FAQ · Vitrine · Materiais · Logs         │
└─────────────────────────────────────────────────────┘
```

## As tecnologias (e por que cada uma existe)

### Frontend — o que aparece na tela

| Tecnologia | Pra que serve | Analogia |
|---|---|---|
| **React 19** | Monta as telas a partir de "componentes" | Peças de Lego: cada botão/card é uma peça reaproveitável |
| **TypeScript** | JavaScript com "verificação de tipos" | Um corretor ortográfico para código: avisa erros antes de rodar |
| **Vite 6** | Empacota e serve o código durante o desenvolvimento | A "fábrica" que transforma seu código em arquivos que o navegador entende |
| **Tailwind CSS 4** | Estiliza tudo (cores, espaçamentos, fontes) | Em vez de criar arquivos de estilo separados, você escreve classes direto no HTML |
| **React Router 7** | Controla as páginas/URLs (`/catalogo`, `/admin`...) | O "GPS" do site: decide qual tela mostrar pra cada endereço |
| **Framer Motion** | Animações suaves (fade, slide) | O "diretor de cena" das transições |
| **Three.js + React Three Fiber** | Visualizador 3D dos modelos STL | O motor que renderiza as peças 3D girando na tela |
| **Recharts** | Gráficos do painel admin | Desenha os gráficos de vendas/pedidos |
| **Sonner** | As notificações "toast" (caixinhas no rodapé) | O sistema de avisos rápidos |
| **Lucide React** | Os ícones | Biblioteca de ícones prontos |

### Backend — os bastidores

| Tecnologia | Pra que serve |
|---|---|
| **Firebase Auth** | Login com Google. O Google cuida de toda a segurança de senha |
| **Firestore** | Banco de dados. Guarda produtos, pedidos, usuários, etc. |
| **Firebase Storage** | Guarda arquivos (imagens de produtos, capas de pastas) |
| **Express (server.ts)** | Mini-servidor próprio para: pagamentos Stripe, notificações Telegram, importar metadados de modelos 3D, proxy de imagens |
| **Stripe** | Processa pagamentos com cartão e PIX |
| **Telegram Bot** | Te avisa no Telegram quando entra pedido novo ou pagamento |

### Por que Firebase E um servidor Express?

O Firebase resolve 90% do backend sozinho (o navegador fala direto com ele).
Mas algumas coisas **não podem** rodar no navegador por segurança:

1. **Stripe** — a chave secreta do Stripe nunca pode ficar no navegador
2. **Telegram** — o token do bot também é secreto
3. **Importação de modelos** — sites como MakerWorld bloqueiam requisições vindas de navegador (CORS); o servidor busca por você
4. **Proxy de imagens** — mesmo motivo: o servidor baixa a imagem externa e entrega pro navegador converter pra WebP

## Como o projeto roda

### No seu computador (desenvolvimento)
```bash
npm install     # instala as dependências (1x só)
npm run dev     # sobe tudo em http://localhost:3000
```
O comando `dev` inicia o servidor Express, que por sua vez liga o Vite. Um processo só, uma porta só.

### Na internet (produção)
```bash
npm run build   # gera a versão otimizada em dist/
npm run start   # roda o servidor em produção
```
O deploy é feito pela **Vercel** (o arquivo `vercel.json` configura isso).

### Verificar se o código tem erros
```bash
npm run lint    # roda o TypeScript verificando tudo, sem gerar arquivos
```

## Os números do projeto (hoje)

- **~58 arquivos** de código TypeScript/React em `src/`
- **~16 coleções** no banco Firestore
- **8 páginas públicas** + painel admin com **12 abas**
- **18 componentes** de painel admin separados
- Maior arquivo: `AdminDashboard.tsx` com **~1.760 linhas** (precisa ser dividido — veja doc 06)
