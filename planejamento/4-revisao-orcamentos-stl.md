# Revisão: Fase 4 - Upload Tridimensional, Validação Holográfica e Fatiador Matemático

Este documento realiza um diagnóstico técnico focado no canal de orçamentos customizados (Modelos STL de Usuário) para manufatura na **Inovalt 3D**.

---

## 🔍 1. Auditoria Funcional do Workflow STL Customizado

```
       [ UPLOAD STL / OBJ / STEP ] ───> [ VALIDAÇÃO EM 4 CAMADAS ] ───> [ ANÁLISE DE MALHA (2s) ]
                                                                                   │
         Gera Orçamento com Preço Hardcoded <── Escolhe Material & Infill <────────┘
```

### 🟢 O que já está funcionando (Estável)
* **upload Multiformato com Arrasto (Drag & Drop)**:
  - Interface que aceita arquivos tridimensionais `.STL`, `.OBJ`, `.STEP` e `.IGES`, com suporte duplo a clique convencional e arrasto.
* **Validação de Arquivos Contra Ataques e Corrupção (Security Guard)**:
  - Filtro rigoroso em 4 barreiras:
    1. *Formato*: Rejeita arquivos fora da grade autorizada.
    2. *Tamanho Máximo*: Bloqueio de arquivos maiores que 50MB para segurança do servidor de nuvem.
    3. *Nome do Arquivo*: Checagem de limite máximo de 80 caracteres.
    4. *Criptografia Anti-Injeção*: Regex eliminando acentos e caracteres especiais, evitando furos de faturamento em sistemas web.
* **Leitor Visual 3D Proativo**:
  - Injeção da geometria no canvas local em WebGL via `<STLViewer />`, permitindo giro tridimensional com clique ou toque.
* **Fatiamento Reativo Base**:
  - Estado local gerenciando a escolha do filamento cadastrado no Firestore e controle deslizante de Dureza/Infill variando de 10% a 80%.

### ❌ Lacunas de Experiência e Gaps Identificados
1. **Estagnação Estimativa de Cálculo (Fixed Price Illusion)**:
   - Independente do tamanho do arquivo físico, do acabamento escolhido (PLA Silk Premium vs PLA Comum) ou do slider de preenchimento (Infill de 10% ou robusto de 80%), o valor na tela de configuração se mantém travado em **R$ 45,90**. Essa inércia de cálculo confunde o cliente antes do disparo ao servidor.
2. **Falta do Telefone de Resposta Comercial (Missing Contact)**:
   - A requisição é salva na coleção `quotes` com os campos `userId`, `userName`, `fileName`, `materialId` e `infill`. O telefone do cliente **não é anexado**, forçando o painel admin e o técnico da Inovalt a pesquisar de forma manual o contato do usuário para fechar o negócio.
3. **Inexistência de Upload Físico ao Storage**:
   - Atualmente, por ser uma simulação de frontend pura, o arquivo físico não é hospedado no Firebase Storage. O engenheiro da fábrica física não consegue receber o arquivo real enviado pelo cliente, inviabilizando o fatiamento no Cura.

---

## 🛠️ 2. Plano de Melhorias e Evolução (Fase 4)

Com o intuito de viabilizar a precificação autônoma de qualquer arquivo importado e solidificar a manufatura, propomos as melhorias:

### 🚀 A. Evolução 1: Algoritmo de Estimativa Volumétrica por Peso Provisório
* **Ação**: Implementar fórmula de custo cinético baseada no tamanho do arquivo (como proxy para o detalhamento da malha) e as constantes de engenharia do material:
  - O tamanho do arquivo em MB servirá de multiplicador para a estimativa de peso físico da peça (ex: 1MB $\approx$ 15g de material).
  - Integrar os sliders de Infill% e a densidade ao cálculo direto do valor para que deslizar o dedo altere dinamicamente a estimativa visível.
  $$\text{Custo Estimado} = \text{Peso Estimado} \times \text{Preço/g do Material} \times \left(\frac{\text{Infill} + 20}{100}\right) + \text{Margem de Configuração (R\$ 15,00)}$$

### 📱 B. Evolução 2: Captura Consistente de WhatsApp no Formulário
* **Ação**: Se o usuário não possui telefone cadastrado no perfil local do `AuthContext`, renderizar um elegante input reativo de WhatsApp antes do envio final da peça para a fila de faturamento.
* **Efeito**: Auto-anexar o número no documento de orçamento enviado ao Firestore para facilitação imediata de contato.

---

## 🚀 3. Arquitetura da Solução Técnica

Abaixo está o design do modelo técnico para faturamento e processamento remoto:

### Estrutura Cadastral de Orçamento customizado (`quotes/{quoteId}`):
```json
{
  "userId": "usr_783df8a",
  "userName": "Carlos S.",
  "status": "PENDING",            // Estados: PENDING, ANALYZING, SENT, APPROVED
  "fileName": "suporte_placa.stl",
  "fileSizeMB": 5.4,              // Salva o volume físico em disco para análise técnica
  "materialId": "pla-silk", 
  "infill": 35,
  "clientPhone": "11999998888",   // Novo: Captura segura de lead para WhatsApp do engenheiro
  "clientNotes": "Quero com bastante resistência nas abas pois sofrerá alto estresse mecânico",
  "estimatedPrice": 85.30,        // Calculado reativamente por faturamento local
  "createdAt": "Timestamp"
}
```

### Código do Simulador de Peso e Faturamento Reativo:
```typescript
const calculateLiveEstimate = () => {
  if (!file || !material) return 0;
  
  // Aproxima o peso físico a partir do tamanho do arquivo (1MB = ~12 gramas de matéria-prima)
  const sizeInMB = file.size / (1024 * 1024);
  const baseWeightGrams = Math.max(10, sizeInMB * 12);
  
  // Aplica o fator de infill (preenchimento interno)
  const infillFactor = (infill + 20) / 100;
  
  // Preço por grama do material configurado (Default fallback R$ 0.15)
  const rateG = material.pricePerGram || 0.15;
  
  // Taxa base fixa de setup da impressora
  const setupFee = 15.00;
  
  return (baseWeightGrams * rateG * infillFactor) + setupFee;
};
```

---

## 📊 4. Confirmação do Próximo Passo

Avalie a evolução refinada para a **Fase 4**. Esta estimativa matemática resolve o atrito comercial de preços estáticos sem exigir complexidade desnecessária do servidor.

Quando aprovar, solicite a revisão da **Fase 5: Área de Clientes (Painel de Monitoramento)**! Como gostaria de prosseguir?
