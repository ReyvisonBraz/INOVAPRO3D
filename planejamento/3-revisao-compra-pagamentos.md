# Revisão: Fase 3 - Fluxo Transacional, Cálculo de Logística e Faturamento Pix Instatâneo

Este documento apresenta uma revisão de engenharia detalhada para o motor transacional (Carrinho, Logística e Integração de Meio de Pagamento) da **Inovalt 3D**.

---

## 🔍 1. Auditoria do Fluxo de Carrinho & Transação

```
       [ CARRINHO ] ──────> [ ETAPA 1: CEP / Logística ] ──────> [ ETAPA 2: Escolha de PIX ]
                                      │
         Gera Sucesso (Sem Pix) <─────┴─── [ ETAPA 3: Sucesso ] (Gera Pedido "PENDING_PAYMENT")
```

### 🟢 O que já está funcionando (Estável)
* **Carrinho de Compras Global (`CartContext`)**:
  - Implementado em estado centralizado React Context abrangendo cálculo de somas (`total`, subtotal), incremento unitário de item individual e remoção limpa do portfólio.
  - Multi-estruturação de itens (produto de catálogo puro versus projeto STL parametrizado por escala e multi-valores).
* **Checkout por Etapas (Stepper UI)**:
  - Componente visual robusto segmentado em 3 fases: Distribuição de Logística, Pagamento de Insumos e Sinal de Sucesso Concluído.
  - Visual responsivo otimizado para celulares com menu flutuante colado no rodapé (*sticky bottom*) que expõe a precificação de faturamento.
* **Salvamento Unificado no Firestore (`addDoc`)**:
  - Criação correta do manifesto definitivo do pedido com status inicial `PENDING_PAYMENT`, associando o identificador do comprador (`userId`), o preço com frete somado e as informações de entrega passadas pela interface.

### ❌ Lacunas de Experiência e Gaps Identificados
1. **Atrito de Cadastro no CEP (No ViaCEP Autofill)**:
   - O input de CEP é puramente manual. O cliente precisa digitar a rua, número, bairro e cidade de próprio punho. Isso aumenta o risco de digitação incorreta das remessas de frete.
2. **Fixação Artificial do Cálculo de Logística (Flat Rate Lock)**:
   - A precificação do envio apoia-se em um plano de taxa única constante (`flatRate`) lido da coleção `settings/shipping`. Não há cálculo reativo que meça distâncias interestaduais (ex: CEP de São Paulo capital vs Norte/Nordeste).
3. **Frustração Pró-Ativa no Faturamento Pix (No Key on Success)**:
   - Ao avançar para a Etapa 3 (Sucesso), o aplicativo parabeniza o usuário pela ordem aberta mas **não expõe** a chave Pix de recebimento nem o código Copia e Cola correspondente. O cliente fica dependente de ser contatado de forma ativa pelo operador no WhatsApp antes de pagar.
4. **Falta de Integração Real no Server-Side**:
   - Falta amarrar as requisições de pagamento ao Mercado Pago `/api/payment/create` em `server.ts` de forma a produzir faturas Pix reais com o Token de Acesso financeiro.

---

## 🛠️ 2. Plano de Melhorias e Evolução (Fase 3)

Como resolução estratégica para destravar automação no faturamento de orçamentos, as evoluções para a Fase 3 consistem em:

### 🚀 A. Evolução 1: Integração Exclusiva ao ViaCEP (Autocompletação)
* **Ação**: Acoplar ao input do CEP um gatilho reativo à digitação de 8 números.
* **Comportamento**: A plataforma efetua uma requisição assíncrona para `https://viacep.com.br/ws/${CEP}/json`, preenchendo automaticamente os campos `Logradouro`, `Bairro` e `Cidade/UF` na tela e poupando tempo do cliente.

### 📱 B. Evolução 2: Cálculo Reativo de Frete (Dynamic Routing)
* **Ação**: Implementar lógica regressiva ou faixas de CEP no cálculo de frete:
  - Se o CEP do cliente iniciar com os dígitos correspondentes a São Paulo (`01000` a `19999`), cobrar um custo local reduzido (ex: R$ 15,00) ou conceder frete grátis se ultrapassar R$ 150.
  - CEPs de outras regiões geográficas (fora de SP) recebem acréscimo interestadual dinâmico calculado proporcionalmente.

### 💳 C. Evolução 3: Exibição Imediata do Pix Copia e Cola (Success Screen)
* **Ação**: Injetar no fluxo de Sucesso (Etapa 3) a exibição do **Pix Copia e Cola**.
* **Funcionamento**: Apresentar na tela um bloco visual elegante para copiar a chave gerada com um clique, um indicador dinâmico de temporizador para pagamento de 15 minutos e um botão que redireciona o cliente para o WhatsApp de suporte anexando o comprovante fiscal automaticamente.

---

## 🚀 3. Arquitetura da Solução Técnica

Abaixo está o modelo de dados unificado para as transações financeiras automáticas:

### Script de Autocompletar CEP na Interface:
```typescript
const handleCepChange = async (cep: string) => {
  const sanitized = cep.replace(/\D/g, '');
  setAddress(prev => ({ ...prev, zip: sanitized }));
  
  if (sanitized.length === 8) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${sanitized}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          street: data.logradouro,
          city: `${data.localidade} - ${data.uf}`,
          number: prev.number || '' // Foca no campo de número do domicílio
        }));
      }
    } catch (err) {
      console.error("ViaCEP calculation failed:", err);
    }
  }
};
```

### Estrutura Visual da Fatura Pix na Tela de Sucesso:
```json
{
  "orderId": "ORD-5XF38",
  "pixKey": "00020126420014br.gov.bcb.pix...", // Chave Copia e Cola Pix gerada
  "timerSeconds": 900,                        // 15 Minutos de validade transacional
  "supportRedirectPhone": "5511999998888"
}
```

---

## 📊 4. Confirmação do Próximo Passo

Revise todos os pontos apresentados para a melhoria de conversão da **Fase 3**. Esta infraestrutura robustece o funil comercial e dá uma autonomia incrível ao cliente Inovalt 3D.

Quando for propício, solicite a revisão da **Fase 4: Orçamentos STL Personalizados e Fatiamento Técnico**! Como deseja caminhar?
