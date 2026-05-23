# Plano de Ação: Link de Proposta Externa e Faturamento do Cliente

Este plano visa enriquecer a conversão comercial de prospects corporativos ou clientes finais B2C, permitindo criar um link seguro e público de visualização rápida da proposta de manufatura personalizada.

---

## 🎯 Escopo Geral

Criar uma rota pública atraente que represente uma proposta comercial formal de impressão 3D, contendo os detalhes estéticos da peça, valores, estimativa de conclusão, e botões diretos de aceitação do orçamento para faturamento automático.

## 📝 Pontos de Implementação

1. **Geração de URL Segura do Orçamento**:
   * Gerar um hash único de id de orçamento (`quotes/ID_PUBLICO`) para que o administrador copie com facilidade um link formal para enviar ao WhatsApp ou e-mail de compras corporativo.

2. **Interface Pública de Detalhe da Proposta (Área do Cliente)**:
   * Criar uma tela dedicada sem necessidade de login complexo (autenticação simplificada por e-mail ou token do link) apresentando:
     - Dados do modelo, peso líquido, infill e cor selecionada.
     - Representação do custo unitário e faturamento total.
     - Condições comerciais e prazo de fabricação.

3. **Interação Comercial de Sucesso (Aprovação ou Recusa)**:
   * **Se aprovada**: Transicionar o orçamento diretamente para status `APPROVED/PENDING_PAYMENT`, apresentando imediatamente o Pix Copia-e-Cola e alertando o painel administrativo.
   * **Se recusada**: Solicitar uma justificativa breve (feedback de custo alto, prazo longo, alteração de escopo), salvando essas anotações nas notas administrativas do orçamento para futuras melhorias de precificação.
