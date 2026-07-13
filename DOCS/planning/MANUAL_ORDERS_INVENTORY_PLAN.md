# Pedidos manuais, CRM e estoque de filamentos

## Objetivo

Permitir que a equipe monte pedidos e orcamentos pelo painel, mantenha dados uteis
dos clientes e controle filamento em gramas durante a producao.

## Decisoes de dominio

- Pedido e orcamento compartilham o mesmo formato de itens.
- `customerId` e a ligacao estavel com o CRM; email permanece como snapshot.
- Valor de venda e consumo de material sao independentes.
- Orcamentos nao reservam estoque.
- A entrada em `QUEUE` reserva material.
- A entrada em `PRINTING` converte a reserva em consumo.
- Cancelamento anterior ao consumo libera a reserva.
- Estoque nunca pode ficar negativo e toda mudanca gera uma movimentacao.
- Materiais antigos sem saldo quantitativo continuam visiveis, mas precisam de
  saldo antes de serem usados na producao.

## Modelo resumido

### `materials/{id}`

Campos principais: tipo, marca, cor, diametro, peso nominal, saldo atual,
saldo reservado, estoque minimo, custo por kg, fornecedor, lote, localizacao e
observacoes.

### `orders/{id}` e `quotes/{id}`

`materialUsages` registra `materialId`, item, gramas estimadas, reservadas e
consumidas. Pedidos tambem registram origem, cliente, pagamento, entrega,
subtotal, desconto, acrescimo e observacoes internas/externas.

### `inventoryMovements/{id}`

Livro-razão imutavel com tipo, quantidade, material, pedido, administrador,
motivo e saldos posteriores a operacao.

## Criterios de aceite

1. Admin cria pedido ou orcamento com varios itens e varios filamentos.
2. Conversao de orcamento preserva itens e consumos.
3. Cliente pode ter documento, endereco estruturado, origem, preferencias e
   observacoes internas.
4. Estoque exibe saldo fisico, reservado e disponivel.
5. Pedido sem saldo suficiente nao entra na fila.
6. Reserva e consumo usam transacao atomica.
7. Cancelamento libera somente o que ainda estiver reservado.
8. Movimentacoes mostram quem, quando, quanto e por que alterou o saldo.
9. Dados existentes continuam legiveis.

