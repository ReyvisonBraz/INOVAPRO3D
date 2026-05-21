# 💎 Sistema de Design: "Industrial-Tech-Refined"
Inspirado em 21st.dev, Aceternity e Magic UI.

## 🎨 Fundamentos Visuais
- **Fundo:** Dark Obsidian (`#050505`) com Grid sutil ou Dot Pattern.
- **Luzes (Glow):** Sombras internas com cores neon (`--primary-glow`) e bordas gradientes.
- **Vidro (Glassmorphism):** Blur intenso (20px+) com bordas de 1px semi-transparentes.
- **Cards:** Efeito de "Border Beam" (luz que percorre a borda no hover).

## 🎬 Animações (Motion)
- **Scroll:** Efeito de Parallax suave em seções e "Reveal" progressivo.
- **Botões:** Efeito magnético (se aproxima do cursor) e "Shimmer" (brilho que passa pelo texto).
- **Transições:** "Page Slices" ou "Smooth Fade Slide" entre rotas.
- **Interação:** Feedback hático visual (o elemento "pulsa" levemente ao clicar).

## 🛠️ Componetização
- **Atomic Design:** Separar estritamente componentes de UI (átomos como botões) de componentes de negócio (organismos como o Configurador 3D).

---

# 🚀 Diagnóstico Inteligente (Debug System)
Endpoints e Marcadores de Erro.

## 🔍 Endpoints `/api/debug/*`
- `GET /api/debug/health`: Verifica conexão com Firebase e Latência.
- `GET /api/debug/logs`: Retorna os últimos 50 erros com contexto (Stack trace + User ID).
- `GET /api/debug/env`: Verifica se todas as chaves `.env` necessárias estão presentes (sem exibir os valores).

## 📍 Marcadores de Erro
- **Erro 3D:** Exibe um overlay minimalista no canvas se o arquivo STL falhar ao carregar.
- **Erro de Auth:** Loga o código exato e redireciona para um estado de "Safety Login".
- **Erro de Preço:** Se a calculadora falhar, exibe "Calculando..." com um spinner de luz pulsante em vez de deixar vazio ou com erro 'NaN'.
