# Plano de Ação: Inspetor e Visualizador STL Avançado

Este plano visa enriquecer a análise geométrica e a identificação do modelo 3D diretamente no modal do administrador, integrando suporte para análise de malha e visualizações 3D em tempo real.

---

## 🎯 Escopo Geral

Permitir que o administrador identifique, com alto nível de precisão técnica, as complexidades geométricas de peças faturadas ou de orçamentos (como furos, balanços que exigem suportes, detalhes minuciosos) sem necessitar abrir o slicer local em sua máquina.

## 📝 Pontos de Implementação

1. **Botão de Download de Alta Visibilidade**:
   * Posicionar um botão proeminente de download do arquivo STL/Solid diretamente na barra de cabeçalho do orçamento, indicando claramente o tamanho total do arquivo em megabytes (MB) para antecipar o consumo de banda.

2. **Renderização 3D Leve (Componente Interativo)**:
   * Criar um componente sandbox de Canvas usando Three.js (`@react-three/fiber` e `@react-three/drei` de forma dinâmica ou com importações lazy sob demanda) para carregar o binário ou link STL correspondente da malha.
   * Adicionar luzes básicas em formato de estúdio técnico (Directional, Ambient e Shadow) e controles de rotaçãoorbital (`OrbitControls`) para inspeção de angulações.

3. **Leitura Automatizada de Metadados Geométricos**:
   * Implementar o parser básico de cabeçalho STL na interface para calcular o volume nominal da malha e deduzir as dimensões espaciais reais em milímetros (largura x profundidade x altura).
   * Exibir uma régua de escala técnica simples.
