# Smoke da refatoração (fases 1, 2 e 4)

Roteiro de verificação manual dos 14 commits entre `695fd0d` e `e88191f`.
Servidor de desenvolvimento: `npm run dev` em <http://localhost:3000>.

Ordem por risco: do bloco mais mexido para o menos.

## 1. Produtos — `/admin` › Produtos

O maior bloco movido (520 linhas de JSX). Componente: `AdminProductFormModal.tsx`.

- [ ] "Cadastrar Item" abre o modal e o X fecha
- [ ] Importar por link (MakerWorld/Bambu Lab) preenche os campos e mostra "Origem: ..."
- [ ] "Traduzir PT" no nome e na descrição funciona e desabilita durante a tradução
- [ ] Ativo/Inativo alterna e o estoque aceita número
- [ ] Categoria: selecionar existente e criar nova com Enter
- [ ] Fotos: upload de arquivo e importação por URL
- [ ] Dimensões, specs técnicas e material de produção salvam
- [ ] Salvar cria o produto; reabrir em edição traz os dados certos

## 2. Categorias — `/admin` › Categorias

Componente: `AdminCategoryFormModal.tsx`.

- [ ] Criar categoria principal
- [ ] Criar subcategoria (campo "Local da categoria")
- [ ] Imagem de capa por URL e por upload; o X remove a preview
- [ ] Editar categoria existente — ela não pode aparecer como mãe de si mesma

## 3. Mover produto de categoria — comportamento novo

Único ponto onde o comportamento **mudou de propósito** (commit `ca98118`).

- [ ] Trocar a categoria de um produto atualiza a lista na hora
- [ ] Mover vários em lote mostra o toast com a contagem
- [ ] **Em caso de falha** (desligar a rede antes de mover): aparece toast de erro
      e a lista volta à categoria anterior de cada produto

## 4. Orçamentos — `/admin` › Orçamentos

11 componentes novos. O mais sensível é o assistente de precificação.

- [ ] Abrir um orçamento mostra cabeçalho com o total atual
- [ ] Orçamento vindo da calculadora exibe a faixa âmbar com
      "Editar no cálculo" e "Duplicar"
- [ ] Alterar quantidade ou preço unitário **recalcula o total**
- [ ] Slider e campo de infill andam juntos
- [ ] Assistente: o preço sugerido bate com o de antes da refatoração
- [ ] "Aplicar Preço Sugerido" atualiza "Valor Final Aprovado" e "Total do Lote"
- [ ] Dados do cliente, imagem, validade, condição de pagamento e notas salvam
- [ ] "Visualizar proposta" e "Ficha de produção" geram os documentos
- [ ] WhatsApp abre com a mensagem correta
- [ ] "Aprovar e faturar" pede confirmação, gera o pedido e mostra a tela de
      sucesso com Pix e "Ir para os Pedidos"
- [ ] Descartar pede confirmação e exclui

## 5. Pedidos — `/admin` › Pedidos

Componente: `AdminOrderDetailModal.tsx`.

- [ ] Abrir um pedido mostra os dados e o total
- [ ] Trocar o status persiste
- [ ] "Editar Itens" permite mudar nome, quantidade e preço; salvar recalcula o total
- [ ] Código de rastreio salva ao sair do campo
- [ ] Cancelar e Excluir pedem confirmação antes de agir

## 6. Calculadora — `/calculadora`

19 componentes novos; a página caiu de 1894 para 530 linhas.

- [ ] Peso, tempo, quantidade, material e impressora produzem os mesmos valores
- [ ] Orientação de precificação (piso de negociação, desconto máximo) aparece
- [ ] Salvar orçamento e reabrir mantém os dados
- [ ] Impressão/exportação funciona

## Se algo quebrar

São 14 commits pequenos e independentes. Use `git log --oneline` para achar a
fatia suspeita e `git revert <sha>` para desfazer só ela — não é preciso
reverter o conjunto.
