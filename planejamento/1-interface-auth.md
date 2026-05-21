# Fase 1: Interface e Autenticação

Foco na primeira impressão do usuário e no fluxo de entrada seguro.

## 🎨 Detalhamento da Interface

### 1. Landing Page (Home) — Componentes de Impacto
- **HeroSection:** Título com `tracking-tight`, animação de entrada com `framer-motion`. Botão principal com gradiente `--primary`.
- **ProcessSection:** Timeline vertical ou horizontal de 3 passos com ícones da Lucide.
- **MaterialGrid:** Cards com hover effect que revelam detalhes do material (ex: "PLA: Ideal para decorativos").
- **PortfolioMasonry:** Grid de fotos de alta qualidade com efeito de zoom suave.

### 2. Navegação e Layout
- **Navbar:** Sticky com blur background (glassmorphism). Lado direito: Carrinho (com badge de quantidade) e Avatar do usuário (ou botão Login).
- **Footer:** Links institucionais, redes sociais e selo de segurança.
- **Transições de Rota:** Uso do `AnimatePresence` do `motion` para fade-in/out suave entre as páginas.

### 3. Sistema de Autenticação (Firebase Auth)
- **Google Login:** Popup centralizado.
- **User Sync:** Ao logar, verificar se o usuário existe no Firestore. Se não, criar o perfil inicial (Role: CUSTOMER).
- **ProtectedRoutes:** Hook `useAuth` para bloquear acesso à área admin ou checkout se não autenticado.

### 4. Experiência do Usuário (UX)
- **Feedback Visual:** Toasts para mensagens de "Bem-vindo" ou erros de login.
- **Skeleton Screens:** Placeholder para carregamento de conteúdo da Home.

## 📌 Meta de Qualidade
- Interface dark-first consistente, carregamento de fontes sem CLS (Cumulative Layout Shift) e login funcional em < 3 segundos.
