# Revisão: Fase 2 - Catálogo, Configuração e Precificação Inteligente de Produtos

Este documento detalha o diagnóstico técnico de engenharia, o comportamento dos componentes reativos e o plano de evolução para o Catálogo e o Configurador de Manufatura da **Inovalt 3D**.

---

## 🔍 1. Auditoria Funcional do Configurador & Catálogo

```
       [ PRODUTO SELECIONADO ] ─ Escolhe Material ─> Aplica Multiplicador (priceMult)
                                                                 │
         Gera no STLViewer 3D <──── Adiciona Escala (50%-200%) ──┘
```

### 🟢 O que já está funcionando (Estável)
* **Carregamento sob Demanda (Lazy Infinite Scrolling)**:
  - Scroll infinito com base na API nativa `IntersectionObserver` acoplada ao Firestore, carregando lotes sequenciais de 12 produtos para zero obsolescência de rede.
  - Carregamento assíncrono antecipado (*prefetch*) dos modelos 3D em cache local para zero latência ao mudar de página.
* **Filtros por Abas reativas**:
  - Filtros instantâneos na interface por categorias predefinidas (`DECORAÇÃO`, `UTILITÁRIOS`, `FANTASIA`, etc.).
* **Visualizador STL Integrado (`<STLViewer />`)**:
  - Renderiza o arquivo STL associado através de WebGL.
  - Sincronização cromática em tempo real (o modelo visual no 3D adota instantaneamente a cor física do material escolhido pelo cliente na lateral).
  - Escalonamento volumétrico reativo ao slider de Escala % direto no canvas.
* **Precificação Estimada Dinâmica**:
  - Recalcula ao vivo em formulário reativo o preço final de aquisição:
    $$\text{Preço Final} = \text{Preço Base} \times \text{Multiplicador do Material (priceMult)} \times \left(\frac{\text{Escala}}{100}\right) \times \text{Quantidade}$$

### ❌ Lacunas de Experiência e Gaps Identificados
1. **Acoplamento de Mídia Única (Single-Image Lockout)**:
   - Embora a coleção `products` use o campo `images` como array, o renderizador se apoia somente no primeiro índice `images[0]`. O cliente não consegue ver carrosséis de fotos reais ou diagramas técnicos das dimensões da peça.
2. **Ignorância de Estoque Físico no Funil de Compra (Stock Bypass)**:
   - Se o estoque `stock` de uma peça industrial atingir zero na fábrica, o botão "SOLICITAR IMPRESSÃO" permanece habilitado, gerando atritos pós-venda devido a quebras de estoque físico invisíveis.
3. **Ausência de Bounding Box Tridimensional de Escala (Dimension Guessing)**:
   - Ao deslizar para 120% ou 75%, o cliente sabe o percentual absoluto da escala, mas não faz ideia das dimensões físicas espaciais finais (ex: *largura, altura* ou *profundidade* em milímetros), correndo o risco de encomendar uma peça que não cabe no seu espaço.
4. **Acoplamento Estático no Prazo de Produção (Lead Time Hardcoding)**:
   - A exibição do tempo de dias úteis baseia-se em constantes ou falback estático de 7 dias se o metadata `settings/production` estiver vazio no Firebase.

---

## 🛠️ 2. Plano de Melhorias e Evolução (Fase 2)

Para garantir segurança industrial e interatividade avançada nas escolhas de projetos, o plano readequado para a Fase 2 será estruturado em:

### 🚀 A. Evolução 1: Travamento de Estoque Ativo (Stock Safeguard)
* **Ação**: Implementar check no botão de compra:
  - Se `product.stock === 0`, o botão se transformará em um badge cinza inativo **"Esgotado • Solicitar Sob Demanda"** e o seletor de quantidade será travado.
  - Badge visual pulsante de "Poucas Unidades" ativo quando o estoque for menor ou igual a 3.

### 📐 B. Evolução 2: Bounding Box e Dimensões Físicas ao Vivo (Real Dimensioner)
* **Ação**: Utilizar o bounds do arquivo dentro do `<STLViewer />` ou recuperar as dimensões originais da peça gravadas no Firestore (ex: `dimensions: { x: 50, y: 50, z: 80 }`).
* **Cálculo de Rede**: Apresentar na interface a dimensão reescala em tempo real:
  $$\text{Dime Final} = \text{Dimensão Base} \times \frac{\text{Escala}}{100} \, \text{mm}$$
  - Ex: *"Dimensões Finais: 60 x 60 x 96 mm"*.

### 🖼️ C. Evolução 3: Carrossel do Catálogo com Múltiplas Imagens (Media Hub)
* **Ação**: Expandir o visualizador de fotos estáticas na lateral do 3D para um seletor de minitabs, permitindo que o cliente alterne entre a renderização WebGL do modelo computacional e as fotos reais da peça impressa em alta resolução.

---

## 🚀 3. Arquitetura da Solução Técnica

Abaixo está o modelo de dados reestruturado e as fórmulas para o faturamento real:

### Parâmetros Extras no Modelo de Produto (`products/{productId}`):
```json
{
  "name": "Vaso Sextavado",
  "basePrice": 45.00,
  "stock": 14,                    // Novo: Controle estrito de estoque físico
  "images": [
    "https://images.unsplash.com/...1",
    "https://images.unsplash.com/...2" // Novo: Grade expandida de imagens
  ],
  "baseDimensions": {             // Novo: Dimensões físicas originais (mm)
    "x": 120,
    "y": 120,
    "z": 150
  },
  "technical": {
    "resolution": "0.20mm",
    "infill": 15,
    "printTime": "4h 12m"
  }
}
```

### Código de Cálculo de Dimensões Reativas no Detalhe:
```typescript
{product.baseDimensions && (
  <div className="flex gap-2 text-xs font-mono text-white/50 bg-white/5 p-4 rounded-xl items-center justify-between">
    <span>Dimensões Estimadas:</span>
    <span className="text-primary font-black">
      {Math.round(product.baseDimensions.x * (scale / 100))} x{" "}
      {Math.round(product.baseDimensions.y * (scale / 100))} x{" "}
      {Math.round(product.baseDimensions.z * (scale / 100))} mm
    </span>
  </div>
)}
```

---

## 📊 4. Confirmação do Próximo Passo

Analise o roteiro estratégico da **Fase 2**. Essas otimizações blindam as vendas e reduzem drasticamente as trocas ou suporte por dimensão equivocada de termoplásticos.

Quando estiver pronto, valide a transição para a **Fase 3: Fluxo de Compra e Pagamentos Integrados (Checkout/Frete)**! Como deseja avançar?
