# Roadmap de Desenvolvimento - InovaLT 3D

Este documento registra as funcionalidades planejadas para as próximas iterações do sistema de e-commerce de impressão 3D.

## 🚀 Funcionalidades Prioritárias

### 1. Visualização 3D Dinâmica (Frontend)
- **O que é**: No `ProductDetail.tsx`, integrar a cor selecionada do material diretamente no visualizador do modelo 3D.
- **Impacto**: Aumento da conversão ao permitir que o cliente visualize exatamente como a peça ficará.

### 2. Sistema de Afiliados e Revendedores (CRM/Marketing)
- **O que é**: Criar um tipo de usuário "Afiliado".
- **Funcionalidades**:
  - Geração de cupons únicos vinculados ao ID do afiliado.
  - Painel admin para visualizar vendas geradas por cada parceiro.
  - Cálculo automático de comissão (ex: 10% do valor da peça).

### 3. Calculadora de Lucro e Margem Real (Admin/Financeiro)
- **O que é**: Uma ferramenta na aba `Financeiro` para ajuste fino de preços.
- **Variáveis**:
  - Custo do Rolo (Bambu Lab/Esun/etc).
  - Consumo de Energia da Impressora (kWh).
  - Depreciação da Máquina/Bicos.
  - Falhas (margem de erro de 5-10%).
- **Resultado**: Sugestão de preço de venda e visualização do lucro líquido real por grama.

---

*Nota: Monitoramento remoto via câmera e IA de análise de falhas foram descartados por já estarem integrados nativamente via Bambu Studio/App.*
