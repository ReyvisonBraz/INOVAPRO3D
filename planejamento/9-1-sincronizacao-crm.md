# Plano de Ação: Sincronização Cadastral Bidirecional (CRM e Contatos)

Este plano visa garantir a consistência e centralização de contatos no banco de dados da Inovalt 3D, integrando perfeitamente a coleção de Orçamentos (`quotes`) com a base de Clientes (`users`/`customers`).

---

## 🎯 Escopo Geral

Garantir que qualquer modificação feita pelas especificações de um orçamento (como o telefone de contato) seja propagada de forma inteligente e automática para o cadastro geral do cliente no CRM, e vice-versa.

## 📝 Pontos de Implementação

1. **Sincronização no Salvamento de Especificações**:
   * Identificar o e-mail ou identificador único do cliente associado ao orçamento durante a gravação.
   * Ao rodar a chamada no Firestore para atualizar `quotes`, disparar paralelamente uma atualização condicional na coleção de usuários (`users`), mantendo o campo `phone` unificado.

2. **Detecção Cadastral Inteligente**:
   * Se um usuário sem cadastro digita um número de WhatsApp ao solicitar um orçamento e, no futuro, realizar o cadastro tradicional na plataforma pública, o sistema deve unificar as informações baseando-se no e-mail correspondente.

3. **Validação de Formato Unificado**:
   * Padronizar a gravação de contatos utilizando apenas caracteres numéricos (remoção de caracteres especiais como `()`, `-` e espaços no banco para facilitar integrações com gateways e ferramentas de envio de WhatsApp).
