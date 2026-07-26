# Planejamento — Calculadora Bambu e falhas de produção

## Objetivo

Separar duas etapas do sistema:

1. A calculadora transforma os dados reais do Bambu Studio em custo previsto e
   orçamento.
2. A produção registra tentativas, falhas e consumo efetivo, ajustando estoque e
   custo real sem alterar retroativamente o orçamento original.

O Bambu Studio é a fonte de verdade para peso e tempo previstos. A aplicação não
deve inventar purga, tempo de troca ou reserva adicional quando esses dados já
vierem do fatiador.

---

## Parte 1 — Alterações definidas para a calculadora

### Estrutura do projeto

Um cálculo representa um projeto composto por uma ou mais bandejas:

```text
Projeto
├── Bandeja 1 — cor única
├── Bandeja 2 — cor única
└── Bandeja 3 — multicolor
```

Cada bandeja deve armazenar:

- identificador estável;
- nome;
- tipo: `SINGLE_COLOR` ou `MULTICOLOR`;
- tempo de preparação informado pelo Bambu;
- tempo de impressão do modelo;
- tempo total;
- quantidade de peças produzidas;
- número de repetições da bandeja;
- número de trocas, quando multicolor;
- filamentos e consumos;
- subtotais de material, energia, máquina e preço.

`quantidade de peças` serve para calcular o preço unitário. `repetições da
bandeja` multiplica consumo e tempo somente quando os valores do Bambu
representarem uma única execução.

### Bandeja de cor única

Campos:

- filamento do estoque ou filamento informado manualmente;
- peso total consumido mostrado pelo Bambu;
- tempo total;
- quantidade de peças;
- repetições.

Não pedir Modelo, Corado e Torre neste modo.

### Bandeja multicolor

Campos gerais:

- tempo de preparação;
- tempo de impressão do modelo;
- tempo total;
- número de trocas;
- quantidade de peças;
- repetições.

Campos para cada filamento:

- filamento real do estoque ou manual;
- Modelo (g);
- Corado (g);
- Torre (g);
- Total (g).

O campo `Total` do Bambu é a fonte de verdade para cobrança. A soma de Modelo,
Corado e Torre serve para conferência. Diferenças pequenas de arredondamento não
devem substituir o Total.

```text
custo do filamento = Total × preço real por grama
```

### Filamento manual

Se nenhum item do estoque for selecionado, exigir:

- cor, com exemplo `Preto`;
- marca, com exemplo `3D Fila`;
- tipo: `PLA`, `PLA High Speed`, `PLA Silk` ou `PETG`;
- valor do quilograma;
- peso líquido do rolo, inicialmente 1.000 g.

Nome sugerido:

```text
Preto · 3D Fila · PLA High Speed
```

O orçamento deve registrar que o preço foi manual e que não existe vínculo com
estoque.

### Custos iniciais

Começam zerados e desativados em todo novo projeto:

- embalagem;
- mão de obra;
- insumos extras;
- modelagem;
- acabamento;
- pintura;
- montagem;
- reserva adicional de material.

Permanecem automáticos:

- energia;
- depreciação;
- reposição e manutenção da máquina;
- preço mínimo;
- markups e demais parâmetros comerciais centrais.

### Estoque no orçamento

Salvar orçamento cria apenas consumo previsto:

- não baixar saldo;
- não reservar saldo;
- guardar o consumo previsto por bandeja e por filamento;
- filamentos manuais não geram movimentação de estoque.

### Validações da calculadora

Bloquear salvamento e destacar visualmente quando faltar:

- nome do projeto;
- ao menos uma bandeja;
- nome da bandeja;
- tipo da bandeja;
- tempo total válido e maior que zero;
- quantidade de peças maior que zero;
- repetições maiores que zero;
- filamento do estoque ou todos os dados do filamento manual;
- peso total maior que zero em cor única;
- ao menos dois filamentos em multicolor;
- Total maior que zero em cada filamento multicolor.

Avisar, mas permitir confirmação, quando:

- Modelo + Corado + Torre divergir do Total além da tolerância de
  arredondamento;
- a soma dos consumos ultrapassar o saldo disponível;
- houver filamento manual;
- o custo ou preço calculado parecer abaixo do piso configurado.

### Resultado

Exibir:

- subtotal de cada bandeja;
- consumo e custo de cada filamento;
- peso útil do modelo;
- Corado;
- Torre;
- desperdício multicolor;
- eficiência do material;
- tempo total do projeto;
- energia;
- máquina;
- custos opcionais;
- custo previsto;
- preço mínimo sustentável;
- atacado, varejo, lucro e margem;
- preço unitário.

---

## Parte 2 — Planejamento do registro de falhas

### Princípio

Uma falha pertence a uma tentativa de produção, não ao orçamento. O orçamento
preserva o previsto; a tentativa registra o realizado.

```text
Pedido
└── Produção
    ├── Tentativa 1 — falhou
    └── Tentativa 2 — concluída
```

Cada tentativa deve apontar para uma bandeja específica do projeto.

### Ciclo de estoque

- Orçamento: consumo previsto, sem reserva ou baixa.
- Pedido aprovado: consumo previsto, sem baixa.
- Fila de produção: reservar os materiais vinculados ao estoque.
- Impressão iniciada: manter a reserva durante a tentativa.
- Impressão concluída: confirmar a baixa do consumo da tentativa.
- Falha: confirmar o consumo por pesagem manual de cada rolo utilizado e liberar
  da reserva somente o material comprovadamente não consumido.
- Cancelamento antes de imprimir: liberar toda a reserva.

Se faltar estoque, mostrar necessário, disponível e déficit. O administrador
pode:

- cancelar;
- selecionar outro filamento;
- continuar mediante consentimento explícito.

Continuar com estoque insuficiente deve gerar log com administrador, data,
filamento, necessário, disponível, déficit e justificativa opcional.

### Regra de consumo por pesagem

Não usar o percentual da falha para devolver ou baixar filamento. O percentual
não representa massa com precisão suficiente.

Para cada rolo utilizado, o administrador deve pesar o rolo após a falha. O
sistema calcula:

```text
filamento restante = peso bruto atual do rolo - tara do carretel
consumo real = filamento disponível antes da tentativa - filamento restante
```

Se o estoque já representar apenas o peso líquido do filamento, também permitir
informar diretamente o novo saldo líquido. Para evitar erros, a tela deve mostrar
lado a lado:

- saldo antes da tentativa;
- peso bruto informado;
- tara cadastrada/informada;
- saldo líquido calculado;
- consumo real resultante;
- quantidade liberada da reserva.

Se mais de um rolo foi usado, exigir a pesagem de cada rolo. Para filamento
manual sem vínculo com estoque, registrar o consumo informado para custo real,
mas não criar movimentação de estoque.

### Falha em bandeja de cor única

O administrador informa:

- bandeja;
- percentual em que falhou;
- tempo real transcorrido, quando disponível;
- motivo;
- pesagem final do rolo.

O percentual estima apenas tempo, energia, depreciação e desgaste quando não
houver tempo real. A baixa de filamento vem exclusivamente da pesagem.

### Falha em bandeja multicolor

O percentual não deve distribuir consumo entre as cores. Como não é possível
saber com precisão quais filamentos já foram usados, exigir a pesagem final de
cada rolo utilizado pela bandeja.

A interface deve alertar:

> Em multicolor, o progresso não determina quanto de cada filamento foi usado.
> Pese cada rolo para confirmar o consumo.

O percentual continua válido para estimar tempo, energia e custo-máquina quando
o tempo real não estiver disponível.

### Falha em projeto multipartes

O administrador deve primeiro selecionar qual bandeja falhou. Isso delimita:

- tempo previsto;
- filamentos daquela bandeja;
- peso previsto;
- reserva daquela tentativa;
- peças afetadas.

Depois informa o percentual da falha. O sistema nunca deve aplicar o percentual
ao projeto inteiro nem às outras bandejas.

Exemplo:

```text
Projeto: Satoru Gojo
Bandeja que falhou: Roupa branca
Progresso: 42%
```

Somente o filamento e o tempo da bandeja `Roupa branca` entram no cálculo da
falha. Bandejas concluídas ou ainda não iniciadas permanecem inalteradas.

Se a bandeja multipartes selecionada também for multicolor, aplicar as regras de
falha multicolor dentro daquela bandeja.

Se a bandeja produzir várias unidades iguais, como chaveiros, mostrar
opcionalmente:

- quantidade planejada;
- quantidade que ficou boa;
- quantidade descartada;
- quantidade que precisará ser reimpressa.

Não exigir esse detalhamento para bandejas que produzam uma única parte.

### Tempo, energia e máquina perdidos

Prioridade:

1. tempo real transcorrido informado pelo administrador/Bambu;
2. estimativa `tempo total da bandeja × percentual concluído`.

Usar o tempo da tentativa para:

- energia consumida;
- depreciação;
- reposição/manutenção;
- custo real perdido.

Não usar o percentual do projeto completo.

### Campos obrigatórios da falha

- tentativa;
- bandeja;
- percentual entre 0 e 100;
- motivo;
- destino da falha: `DESCARTE`;
- pesagem final de cada rolo vinculado ao estoque;
- confirmação do administrador.

Campos recomendados:

- tempo transcorrido;
- observações;
- foto da falha;
- justificativa para continuar com estoque insuficiente.

### Sinalização e prevenção de erros

Antes da confirmação:

- contornar campos vazios em vermelho;
- mostrar mensagem curta abaixo do campo;
- mover foco para o primeiro erro;
- abrir automaticamente a seção recolhida que contém erro;
- desabilitar `Confirmar baixa` enquanto houver erro bloqueante;
- exibir resumo do impacto no estoque;
- exigir checkbox de consentimento em estoque insuficiente;
- não aceitar NaN, números negativos ou percentual acima de 100;
- bloquear pesagem que produza saldo negativo ou saldo maior que o existente
  antes da tentativa sem uma movimentação de correção explícita;
- alertar se o consumo apurado exceder o consumo planejado;
- alertar se tempo transcorrido exceder o tempo previsto;
- impedir confirmação enquanto faltar pesagem de algum rolo utilizado.

### Resultado da falha

Registrar de forma imutável:

- tentativa e bandeja;
- tipo da bandeja;
- percentual;
- tempo previsto e realizado;
- consumo planejado e apurado por pesagem para cada filamento;
- material liberado da reserva;
- energia e máquina consumidas;
- custo da tentativa;
- motivo;
- administrador;
- consentimentos;
- timestamps.

Uma reimpressão cria nova tentativa e nova reserva. Não sobrescrever a tentativa
que falhou.

---

## Modelo de dados sugerido

```ts
type PlateType = "SINGLE_COLOR" | "MULTICOLOR";

interface ProjectPlate {
  id: string;
  name: string;
  type: PlateType;
  preparationTime: string;
  modelPrintTime: string;
  totalTime: string;
  piecesProduced: number;
  repetitions: number;
  filamentChanges?: number;
  filaments: PlateFilamentUsage[];
}

interface PlateFilamentUsage {
  inventoryMaterialId?: string;
  manualMaterial?: {
    color: string;
    brand: string;
    type: "PLA" | "PLA_HIGH_SPEED" | "PLA_SILK" | "PETG";
    pricePerKg: number;
    netWeightGrams: number;
  };
  modelGrams?: number;
  flushedGrams?: number;
  towerGrams?: number;
  totalGrams: number;
}

interface ProductionAttempt {
  id: string;
  orderId: string;
  plateId: string;
  attemptNumber: number;
  status: "QUEUED" | "PRINTING" | "FAILED" | "COMPLETED" | "CANCELLED";
  progressPct?: number;
  elapsedHours?: number;
  failureReason?: string;
  weighedUsages?: AttemptMaterialUsage[];
  requiresInventoryConsent?: boolean;
  inventoryConsentBy?: string;
}
```

Os nomes finais devem ser alinhados aos tipos já existentes antes da
implementação para evitar duplicação de conceitos.

---

## Ordem de implementação

### Fase A — Calculadora

1. Criar o modelo Projeto → Bandejas → Filamentos.
2. Implementar bandeja de cor única.
3. Implementar bandeja multicolor com Modelo, Corado, Torre e Total.
4. Implementar filamento manual.
5. Zerar e desativar custos opcionais.
6. Calcular subtotais por bandeja e total do projeto.
7. Salvar consumo previsto sem movimentar estoque.
8. Adicionar validações e sinalização visual.
9. Atualizar calculadora completa, rápida e modal para o mesmo modelo.
10. Adicionar testes de paridade, arredondamento, multipartes e multicolor.

### Fase B — Produção e falhas

1. Criar tentativas de produção vinculadas a uma bandeja.
2. Implementar reserva ao entrar na fila.
3. Implementar conclusão e baixa confirmada.
4. Implementar falha de cor única.
5. Implementar falha multicolor com pesagem obrigatória de cada rolo.
6. Implementar seleção da bandeja em projetos multipartes.
7. Implementar consentimento para estoque insuficiente.
8. Implementar liberação do saldo não consumido.
9. Implementar nova tentativa/reimpressão.
10. Adicionar auditoria, custo real e testes de estoque.

---

## Critérios de aceite essenciais

- Orçamento nunca reduz nem reserva estoque.
- Falha nunca afeta bandejas não selecionadas.
- Percentual de falha nunca movimenta filamento.
- Consumo de uma falha é apurado pela pesagem de cada rolo utilizado.
- Saldo não consumido é liberado da reserva.
- Estoque insuficiente exige consentimento explícito.
- Campos ausentes impedem baixa e são destacados.
- Nova tentativa não apaga o histórico da tentativa anterior.
- Custo previsto e custo real permanecem separados.
