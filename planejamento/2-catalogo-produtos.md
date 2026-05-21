# Fase 2: Catálogo e Produtos

Transformando a navegação de produtos em uma jornada de customização.

## 📦 Funcionalidades Detalhadas

### 1. Página de Listagem (Catálogo)
- **Filtros Laterais:** Filtro por tecnologia (FDM vs Resina), faixa de preço e popularidade.
- **ProductCards:** Exibir foto real da peça impressa + badge de "Preço Base".
- **Lazy Loading:** Carregamento sob demanda conforme o scroll para performance.

### 2. Página de Detalhes (O Configurador)
- **Seletor de Material dinâmico:** Ao trocar de PLA para TPU, as cores disponíveis devem mudar instantaneamente via estado do React.
- **Slider de Escala:** Slider de 50% a 200%. O volume (cm³) é recalculado matematicamente: `VolumeFinal = VolumeBase * (Escala^3)`.
- **Calculadora de Preço Live:**
    - Variáveis: `basePrice`, `pricePerCm3`, `finishingAdd`.
    - Fórmula: `Final = (MaterialCost * ScaleFactor) + FinishingCost + SetupFee`.

### 3. Visualizador 3D
- **Integração Three.js:** Carregamento de arquivo `.stl` via `STLLoader`.
- **Material Sync:** Se o usuário escolhe "Cor: Laranja", a cor do material no 3D muda para `#FF6B00`.
- **Bounding Box Info:** Mostrar dimensões físicas em tempo real baseadas na escala escolhida.

### 4. Gestão de Dados
- **Firestore Sync:** Busca de materiais e configurações globais (preço/cm³) para garantir que a calculadora sempre use dados do banco.

## 📌 Meta de Qualidade
- O usuário deve sentir confiança no visual da peça e no valor final antes de clicar em "Comprar".
