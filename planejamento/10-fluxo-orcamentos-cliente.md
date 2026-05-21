# Fase 10: Fluxo de Orçamentos e Interatividade do Cliente (Área do Cliente)

Este documento detalha o planejamento arquitetural para fechar o ciclo de vida dos orçamentos STL. Após o administrador analisar e precificar o orçamento, o cliente precisa de uma interface interativa para visualizar a proposta, ler as anotações da engenharia, ver suas especificações e aprovar ou recusar o orçamento com um clique.

---

## 🔍 1. Gaps de Arquitetura Identificados no Fluxo do Cliente

Atualmente, o fluxo do cliente apresenta três principais vulnerabilidades de negócio:
1. **Falta de Notas do Cliente**: No upload de arquivos STL (`CustomQuote.tsx`), o cliente pode apenas escolher o acabamento (material) e o infill. Ele não tem como adicionar notas ou especificações especiais (ex: *"Esta peça é para um cubo de roda mecânico, aumente as paredes se necessário"*).
2. **Contato Desatualizado**: O formulário de envio não armazena ou solicita um telefone de contato rápido se o usuário logado ainda não possui um registrado no perfil, dificultando a abordagem do administrador.
3. **Página Inexistente de Orçamentos**: O usuário não vê a lista de orçamentos criados em local algum da aplicação. Ele envia o arquivo e depois o sistema fica em "silêncio", sem nenhuma seção para acompanhar a análise técnica ou responder (aprovar/recusar) a proposta comercial.

---

## 🛠️ 2. Novo Design Funcional da Área do Cliente (`MyOrders.tsx`)

Para unificar o painel e entregar uma verdadeira "fábrica particular" ao cliente, re-arquitetamos a página `MyOrders.tsx` para acomodar uma aba específica de **Acompanhamento de Orçamentos Customizados**.

### A. Estrutura de Navegação por Abas (Tabs)
A página inicial do painel do cliente (`Meus Projetos`) será dividida em:
* **Aba 1: Pedidos Ativos (`orders`)**: Exibe as compras já realizadas de produtos do catálogo e orçamentos que já foram aprovados e faturados.
* **Aba 2: Orçamentos Avançados (`quotes`)**: Exibe os uploads STL que estão em processo de cotação humana.

### B. Cards Dinâmicos com base nos Estados do Orçamento (`status`)

Cada orçamento na aba do usuário exibirá dinamicamente um estado baseado no workflow administrativo:

1. **`PENDING` / `ANALYZING` (Aguardando Engenharia)**:
   - **Visual**: Card em tons de cinza/azul sutil, com um spinner ou indicador de pulso lento.
   - **Mensagem**: *"Nossos técnicos estão fatiando seu arquivo 3D e avaliando o tempo de impressão e consumo de filamento... Em breve, você receberá a proposta nesta tela ou via WhatsApp."*
   - **Dados exibidos**: Nome do arquivo, visualizador STL em miniatura, material base e preenchimento escolhido.

2. **`SENT` (Proposta Pronta / Aguardando Aprovação)**:
   - **Visual**: Borda em degradê brilhante de destaque (`#FF6B00` ou verde/dourado), indicando que há ação pendente do usuário.
   - **Dados revelados**: 
     - **Preço Final Calculado pela Engenharia** (ex: *R$ 145,00*).
     - **Parâmetros Finais**: Peso real em gramas, tempo estimado da máquina na fábrica e notas do técnico (ex: *"A peça requer 12h de máquina por conta dos suportes necessários. Sugiro PLA Pro pela durabilidade."*).
   - **Painel de Ações Rápidas**:
     - **Botão Verde ✅ APROVAR PROPOSTA**: Ao clicar, o sistema automaticamente muda o status do orçamento para `APPROVED` e gera um novo documento na coleção de pedidos com o status `PENDING_PAYMENT`, gerando o Pix e liberando o fluxo de faturamento.
     - **Botão Cinza Escritório ❌ RECUSAR PROPOSTA**: Abre um pop-up rápido onde o usuário pode rejeitar informando o motivo (opcional), mudando o status para `DECLINED` para auditoria do admin.

3. **`APPROVED` (Aprovado & Faturando)**:
   - **Visual**: Card verde com check de concluído.
   - **Ação**: Direcionamento com um link útil: *"Sua proposta foi aprovada e já geramos seu pedido de produção! Vá para a aba Meus Pedidos para pagar o Pix e iniciar a fabricação."*

4. **`DECLINED` (Cancelado / Recusado)**:
   - **Visual**: Tons pastel apagados.
   - **Mensagem**: *"Proposta cancelada."* (Com opção de reinserir o arquivo para uma nova tentativa).

---

## 💾 3. Mudanças no Banco de Dados (Firestore Schema)

Para viabilizar este fluxo, o documento do orçamento na coleção `quotes` no Firestore receberá campos extras de comunicação direta:

```json
{
  "userId": "usr_x92k392",
  "userName": "Carlos S.",
  "userEmail": "carlos@email.com",
  "phone": "11999998888",         // Novo: Telefone no momento do envio do STL
  "fileName": "suporte_carro.stl",
  "materialId": "pla-pro",
  "infill": 30,
  "clientNotes": "Quero que seja resistente a calor, pois vai no motor.", // Novo: Mensagem do cliente
  
  "status": "SENT",               // Estados: PENDING, ANALYZING, SENT, APPROVED, DECLINED
  
  // Parâmetros preenchidos pelo admin no faturamento:
  "total": 145.00,
  "weight": 85,
  "printTime": "6h 40m",
  "adminNotes": "Adicionada densidade para resistir a compressão leve.",
  
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

## 🧭 4. Otimização no Formulário de Upload (`CustomQuote.tsx`)

Aplicaremos duas modificações sutis, porém potentes no funil de envio:
* **Adicionar o campo `observações/detalhes especiais`**: Antes do clique final para enviar, uma caixa de texto permitirá ao designer incluir detalhes sobre o uso final da peça.
* **Coleta inteligente de Telefone**: Se o usuário logado não tiver o telefone cadastrado no perfil, exibiremos um campo integrado e limpo de celular (com máscara automática `(99) 99999-9999`), atualizando o cadastro básico correspondente para as próximas interações.

---

## 📌 Próximos Passos de Revisão Geral

1. Fazer o merge conceitual do **Faturamento Inteligente Admin** (que calcula custos automáticos) com a **Aba de Aprovação Automática do Cliente**.
2. Criar as subcamadas de navegação limpa na Área do Cliente (`MyOrders.tsx`).

Com a aprovação do seu roteiro, o sistema funcionará com uma engrenagem integrada onde o cliente envia, o admin precifica e o cliente paga, tudo sem sair da plataforma!
