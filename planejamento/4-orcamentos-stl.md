# Fase 4: Orçamentos STL (Custom)

A funcionalidade "premium" que permite ao cliente imprimir qualquer projeto.

## 📂 Detalhamento Tecnológico

### 1. Upload Avançado
- **Firebase Storage integration:** Upload com barras de progresso reais.
- **File Validation:** Bloqueio de arquivos maliciosos; aceitar apenas `.stl, .obj, .3mf`.
- **Metadata Extraction (Opcional no Server):** Tentar extrair volume e Dimensões do cabeçalho do arquivo para dar uma estimativa instantânea "não oficial".

### 2. Workflow de Orçamento
- **Status do Orçamento:** `PENDING` -> `ANALYZING` -> `SENT` -> `APPROVED`.
- **Interação Cliente:** O cliente vê seu arquivo renderizado no Dashboard e pode adicionar comentários ("Quero com 100% de infill pois é peça mecânica").

### 3. Visualizador STL para Cliente
- Componente de visualização em tela cheia na página de upload para confirmar que o arquivo está correto.
- **Mobile Friendly:** Gestos de toque para rotacionar o modelo 3D.

## 📌 Meta de UX
- O processo de envio de arquivo deve ser tão simples quanto um anexo de e-mail, mas com a sofisticação de um visualizador 3D profissional.
