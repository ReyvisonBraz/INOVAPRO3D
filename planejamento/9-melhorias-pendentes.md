# Planejamento: Melhorias Pendentes no Painel Administrativo de Orçamentos e Pedidos

Este documento detalha o diagnóstico dos problemas relatados sobre a perda de dados ao salvar especificações de orçamentos (especialmente o telefone), além de propor um plano de ação completo para otimizar os fluxos de aprovação, faturamento, exclusão, sincronização e novas funcionalidades inteligentes para o fluxo de orçamentos da Inovalt 3D.

---

## 🔍 1. Diagnóstico do Problema Principal (Perda de Dados)

### O Sintoma
> *"Entrei em um orçamento teste, adicionei o número do cliente, cliquei pra salvar, recebi a confirmação porém ao entrar novamente os dados não estão salvos..."*

### A Causa Técnica
1. **Omissão do Campo no Payload do Firestore**: No arquivo `src/pages/admin/AdminDashboard.tsx`, a função `handleSaveQuoteSpecifications` realiza o envio das especificações técnicas ao Firestore:
   ```typescript
   await updateDoc(doc(db, "quotes", quote.id), {
     total: editingQuoteTotal,
     infill: editingQuoteInfill,
     printTime: editingQuoteTime,
     weight: editingQuoteWeight,
     adminNotes: editingQuoteNotes,
     updatedAt: serverTimestamp()
   });
   ```
   **O erro**: O campo `editingQuotePhone` (que armazena o celular do cliente editado na interface) **não foi incluído** nesse objeto de atualização. Portanto, embora o Toast de confirmação apareça na tela indicando sucesso, o número de telefone nunca é persistido na coleção `quotes` do Firebase.

2. **Falta de Sincronização Dupla com o CRM (Clientes)**:
   Muitas vezes, o orçamento é criado por um usuário anônimo ou um cliente com e-mail cadastrado. Quando editamos o telefone dentro do modal de *Orçamento*, o ideal seria atualizar tanto o documento do orçamento específico na coleção `quotes` quanto o celular do próprio cliente associado na coleção `users`/`customers`. Atualmente, essa correlação não está automatizada ao salvar especificações técnicas.

3. **Inconsistência de Estado Local Temporário**:
   Quando a função `handleSaveQuoteSpecifications` executa com sucesso, ela atualiza o estado local `selectedCustomer` mas também esquece de anexar o `phone` atualizado, fazendo com que o dado suma da tela na mesma hora que o modal é reaberto ou atualizado.

---

## 📑 2. Plano de Melhorias Detalhado (Melhorias Pendentes)

Propomos as seguintes melhorias para garantir estabilidade, segurança e uma experiência profissional impecável para o administrador da Inovalt 3D.

### 🛠️ Ação 1: Correção Imediata do Salvamento do Telefone
* **O que faremos**: Alterar a função `handleSaveQuoteSpecifications` para incluir o campo de telefone no documento do orçamento no Firestore (`phone: editingQuotePhone`).
* **Sincronização com o CRM**: Antes de salvar, faremos uma verificação rápida no banco de dados. Se o orçamento possuir um `userId` ou `userEmail` correspondente a um cliente já existente, atualizaremos automaticamente o campo `phone` desse cliente também na coleção de usuários/clientes. Isso garante que o contato nunca mais fique desatualizado no CRM.
* **Preservação de Estado**: Atualizar o estado reativo local `selectedCustomer` para incluir o telefone digitado imediatamente ao salvar, evitando flashes visuais indesejados.

### 🔄 Ação 2: Otimização do Fluxo de Aprovação e Geração de Pedidos
Atualmente, quando um orçamento é aprovado, ele gera um pedido pendente de pagamento (`PENDING_PAYMENT`). Queremos garantir que:
* **Validação Prévia**: O sistema não permita aprovar e faturar se campos essenciais (como Preço Final Aprovado e um telefone de contato válido) não estiverem preenchidos ou salvos.
* **Notificação Integrada**: Após a aprovação e geração do pedido, o administrador receberá uma sugestão na tela de enviar a notificação instantânea para o cliente pelo WhatsApp com as especificações finais e o Pix de pagamento correspondente.

### 🗑️ Ação 3: Alinhamento das Confirmações (Modais Customizados)
Substituímos os diálogos nativos do navegador (`confirm()`) por um componente modal nativo customizado em React e Tailwind que possui o design elegante escuro da marca. Faremos com que:
* Todas as exclusões de registros em lote ou individuais passem por essa camada visual impecável, evitando cliques acidentais e alertando visualmente quando for uma ação destrutiva (em vermelho) ou de faturamento (em verde).

---

## ⚡ 3. Novas Funcionalidades Propostas para o Fluxo de Orçamentos

Identificamos e adicionamos ao plano funcional as seguintes necessidades essenciais para transformar o painel em um sistema profissional definitivo de manufatura digital (3D Printing Bureau):

### 🧮 A. Calculadora Automatizada de Preço de Impressão (Fórmula Inteligente)
Em vez do administrador chutar ou calcular o preço final de cabeça ou em uma planilha externa, o modal de detalhes do orçamento ganhará uma **Calculadora de Auxílio de Preço**.
* **Como funcionará**: No modal de Orçamento, o admin poderá abrir um painel retrátil que calcula o preço recomendado com base em:
  - **Custo do Filamento por Grama** (Ex: R$ 0,15 por grama - R$ 150/kg).
  - **Custo Hora/Máquina** (Ex: R$ 4,50 por hora de impressão).
  - **Taxa de Preparação/Fatiamento** (Taxa fixa de setup).
  - **Margem de Lucro** (Ex: 20%, 50%, etc.).
* **Resultado**: O sistema multiplicará automaticamente o peso em gramas e as horas de impressão, somará as taxas e aplicará a margem para sugerir o preço ideal. Bastará um clique em *"Aplicar Preço Sugerido"* para preencher o campo do preço de faturamento.

### 📁 B. Inspetor e Visualizador STL Avançado (Visualização do Modelo 3D)
Atualmente, o admin vê o nome do arquivo, mas não consegue analisar a geometria da peça facilmente para decidir detalhes de fatiamento no mesmo painel.
* **Como funcionará**: 
  - Adição de um botão de download direto de alta visibilidade para o arquivo STL.
  - Exibição de estatísticas extras extraídas do arquivo (se disponíveis), como dimensões em mm ($X \times Y \times Z$).
  - Proposta de renderizar um mini-visualizador 3D interativo diretamente no modal (utilizando Three.js / React Three Fiber de forma ultra leve) para que o administrador rotacione a peça dentro do painel para analisar a necessidade de suportes ou riscos de impressão.

### 🕒 C. Histórico de Alterações e Notas de Auditoria Interna (Timeline)
Orçamentos passam por negociações. É crucial saber quem mexeu na peça e quando.
* **Como funcionará**: Uma seção de **Histórico do Orçamento** em formato de timeline no final do modal:
  - *"Dia 20/05, 14:00 - Cliente enviou o projeto STL"*
  - *"Dia 20/05, 14:30 - Preço atualizado de R$ 0,00 para R$ 125,00 por Admin"*
  - *"Dia 20/05, 14:31 - Observações internas adicionadas por Admin"*

### 🔗 D. Link Único do Orçamento e Botão de Enviar E-mail/WhatsApp Formal
Hoje o fluxo é focado no WhatsApp, mas muitos clientes corporativos ou B2B exigem propostas formais.
* **Como funcionará**: 
  - Um botão para **Copiar Link da Proposta**. Esse link abrirá uma página externa limpa e bonita (área do cliente) onde o próprio cliente pode ver as especificações da peça 3D (peso, cor, material) e clicar em *"Aprovar Proposta"* ou *"Recusar Proposta"* (escrevendo um feedback de motivo de recusa).
  - Geração de um PDF simples ou visualização para impressão para o cliente anexar no setor de compras deles.

---

## 🚀 4. Arquitetura da Solução Técnica

Abaixo está o modelo de dados e a cadeia de funções modificadas que serão aplicados assim que você autorizar a execução:

### Estrutura do Documento de Orçamento (`quotes/{quoteId}`) pós-correção:
```json
{
  "total": 120.50,          // Salva corretamente
  "infill": 30,             // Salva corretamente
  "printTime": "4h 15m",    // Salva corretamente
  "weight": 85,             // Salva corretamente
  "adminNotes": "Obs...",   // Salva corretamente
  "phone": "11999998888",   // ADICIONADO: Persistência de contato direta no orçamento
  "history": [              // ADICIONADO: Linha do tempo de alterações
    { "date": "2026-05-20T21:50Z", "action": "Orçamento criado" },
    { "date": "2026-05-20T21:53Z", "action": "Atualizado preço e telefone por admin" }
  ],
  "updatedAt": "Timestamp"  // Atualizado pelo servidor
}
```

### Código de Salvamento Consolidado (Esboço técnico planejado):
```typescript
const handleSaveQuoteSpecifications = async (quote: any) => {
  try {
    const phoneClean = editingQuotePhone.replace(/\D/g, '');

    // 1. Atualiza o documento na coleção de Orçamentos
    await updateDoc(doc(db, "quotes", quote.id), {
      total: editingQuoteTotal,
      infill: editingQuoteInfill,
      printTime: editingQuoteTime,
      weight: editingQuoteWeight,
      adminNotes: editingQuoteNotes,
      phone: phoneClean, // Agora persistindo o telefone!
      updatedAt: serverTimestamp()
    });

    // 2. Se o cliente estiver associado, atualiza também a ficha cadastral do cliente no CRM
    if (quote.userId) {
      await updateDoc(doc(db, "users", quote.userId), {
        phone: phoneClean
      }).catch(() => {
        // Ignora silenciosamente se o usuário logado não for encontrado na outra coleção
      });
    }

    // 3. Mantém o estado da tela idêntico ao salvo
    setSelectedCustomer((prev: any) => prev ? {
      ...prev,
      total: editingQuoteTotal,
      infill: editingQuoteInfill,
      printTime: editingQuoteTime,
      weight: editingQuoteWeight,
      adminNotes: editingQuoteNotes,
      phone: phoneClean // Atualiza o estado visual instantaneamente
    } : null);

    fetchData();
    toast.success("Especificações do orçamento salvas com sucesso!");
  } catch (err) {
    toast.error("Falha ao salvar especificações.");
  }
};
```

---

## 📝 5. Como Revisar este Planejamento

Por favor, analise as proposições acima. Esse plano agora aborda tanto as correções essenciais das falhas de persistência quanto expande o fluxo de orçamentos para um patamar extremamente profissional com ferramentas de cálculo dinâmico, visualização STL, histórico de auditoria e geração de propostas externas.

Quando estiver pronto, mande uma mensagem nos autorizando a iniciar a implementação destas fantásticas melhorias!
