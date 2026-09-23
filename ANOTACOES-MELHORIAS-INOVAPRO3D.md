# Anotações de melhorias — Inova Pro 3D

**Data:** 19/09/2026  
**Empresa:** Inova Pro 3D — Santa Maria do Pará  
**Site de referência:** https://www.inovapro3d.com.br/  
**Finalidade:** consolidar os requisitos discutidos para o usuário levar a outra IA.

## 1. Escopo, status e cuidados de interpretação

Este documento reúne solicitações e propostas; não representa implementação, publicação, alteração de configuração ou validação do sistema. Nenhum protótipo ou comportamento é apresentado como testado. As referências ao código abaixo vieram de leituras relatadas na conversa anterior e precisam ser conferidas no estado atual do projeto antes de implementar. Esta consolidação não exigiu acesso ao site, Vercel, GitHub ou Firebase, nem commit ou PR.

Legenda de status:

- **Confirmado:** necessidade ou direção solicitada explicitamente pelo usuário.
- **Proposta a avaliar:** solução de design ou fluxo apresentada para atender à necessidade; não implica aprovação de todos os detalhes.
- **Pendente:** informação, decisão ou verificação ainda necessária.
- **Descartado:** item explicitamente excluído do escopo de implementação.

A autorização para detalhar o plano da calculadora não autoriza implementar código. As sugestões de copy, paleta, etapas finais de produção e arranjos visuais ainda precisam ser avaliadas conforme indicado. Não inventar endereço, ponto de mapa, preços reais, dados comerciais ou aprovações.

## 2. Home: mensagem fixa e comunicação acessível

### Problema e solicitação confirmada

As quatro mensagens rotativas dificultam uma apresentação direta da empresa. O usuário quer substituí-las por uma mensagem fixa, profissional e simples sobre impressão 3D, sem explicar todo o processo no primeiro bloco.

A orientação inicial de retirar referências geográficas foi corrigida: **manter destaque fixo a Santa Maria do Pará**, para que o público local reconheça a empresa. A menção a envio para todo o Brasil não integra a copy sugerida abaixo; sua eventual presença em outros pontos permanece a avaliar.

### Comportamento e design propostos

Copy de trabalho, ainda não final:

> Impressão 3D em Santa Maria do Pará
>
> Encontre produtos no nosso catálogo ou peça um orçamento para sua ideia.

Apresentar ações claras, com hierarquia visual:

- **Ver catálogo e comprar:** ação principal.
- **Mandar mensagem:** contato direto.
- **Solicitar orçamento:** caminho para uma ideia ou demanda personalizada.

Usar fotos e vídeos reais dos produtos e trabalhos. No desktop, posicionar a mídia à direita do texto; no celular, abaixo. Permitir troca manual, com capa e botão de reprodução para vídeos, sem som automático. Vídeos com fala devem ter legendas.

O público pode ter pouca familiaridade com tecnologia: usar linguagem simples, botões grandes, contraste legível e rótulos textuais em vez de depender apenas de ícones. Garantir navegação por teclado e foco visível nos controles de mídia e ações.

**Proposta a avaliar:** abandonar o fundo azul futurístico e os brilhos em favor de uma aparência sóbria e neutra. **A paleta não foi escolhida.**

### Referência técnica relatada e pendências

Foi relatada a existência de `heroCopyOptions` e `AnimatedHeroCopy` em `src/pages/public/Home.tsx`, com alternância a cada 6800 ms. Conferir antes de remover o comportamento. Selecionar as fotos/vídeos reais, validar a copy final e definir os destinos das ações.

### Critérios de aceitação para implementação futura

- A mensagem principal permanece fixa e identifica Santa Maria do Pará.
- Os três caminhos de ação são compreensíveis sem conhecimento técnico.
- Texto e mídia mantêm a ordem e a legibilidade em desktop e celular.
- Controles funcionam por teclado, têm rótulos claros e não reproduzem som automaticamente.
- A aparência final respeita a paleta que vier a ser escolhida, sem tratar esta proposta como decisão concluída.

## 3. Localização: acesso discreto, claro e confiável

### Solicitação e comportamento proposto

Adicionar um botão discreto, mas claramente clicável: **“Santa Maria do Pará · Ver localização”**. A proposta é abrir um modal com animação suave contendo nome da empresa, endereço e prévia de mapa. Tocar na prévia ou em **“Abrir no aplicativo de mapas”** deve abrir a localização correta, de acordo com o dispositivo e as opções disponíveis.

### Pendências obrigatórias

- Endereço completo: **a enviar pelo usuário**.
- Ponto exato/coordenadas: **a enviar ou confirmar**.
- Link de localização: **a enviar ou confirmar**.

Nunca usar o centro da cidade como se fosse a localização real da empresa. Enquanto esses dados estiverem pendentes, a proposta é mostrar a cidade e **“Localização detalhada em breve”**, sem mapa ou rota ativa.

### Responsividade, acessibilidade e aceitação

O modal deve caber no celular, ter fechamento visível, fechar com Escape, controlar o foco por teclado e devolvê-lo ao botão de origem. Respeitar a preferência por movimento reduzido. Após os dados serem fornecidos, conferir se a prévia e o botão abrem o mesmo ponto correto. Antes disso, nenhum controle deve sugerir que uma rota real está disponível.

## 4. Calculadora: solicitações confirmadas

### 4.1 Limpar calculadora a qualquer hora

**Problema:** o usuário precisa iniciar um novo cálculo sem ser obrigado a salvar o atual.

Disponibilizar **“Limpar calculadora”** a qualquer momento. Se houver dados preenchidos, apresentar confirmação breve. A limpeza deve:

- Limpar projeto, cliente, imagem e observações do cálculo atual.
- Desvincular a edição de um orçamento existente.
- Remover o rascunho associado, para que os dados não reapareçam ao retornar.
- Restaurar parâmetros personalizados aos padrões configurados.
- Preservar orçamentos já salvos e tarifas/configurações padrão.

**Zerar o formulário não significa zerar tarifas.** Restaurar padrões locais do orçamento também não deve alterar padrões globais.

**Aceitação:** limpar um cálculo novo ou em edição deixa a calculadora pronta para outro trabalho; o rascunho não retorna; o orçamento salvo original permanece íntegro; os padrões configurados continuam válidos. A confirmação e o resultado precisam ser utilizáveis por teclado e no celular.

### 4.2 Importar dados do fatiador por print

Permitir **arrastar**, **colar diretamente** ou **selecionar uma imagem**. Exibir uma prévia dos dados extraídos, editável para conferência antes de aplicar. Tornar explícita a escolha entre **substituir** os dados atuais e **acrescentar** ao cálculo, sem sobrescrita silenciosa.

Foi relatada leitura de imagem/clipboard já existente em `SlicerPasteBox`; reaproveitar esse recurso. O suporte a drag and drop precisa ser conferido e, se necessário, completado. No celular e para quem não usa arraste, manter seleção de arquivo acessível. Indicar erros de leitura e permitir correção manual.

**Aceitação:** os três meios de entrada previstos são verificados; o usuário pode revisar e corrigir dados antes da aplicação; substituir/acrescentar tem efeito compreensível e não duplica conteúdo involuntariamente.

### 4.3 Item explicitamente descartado

**Não implementar análise de STL nem previsão automática de falhas.** Este item foi descartado pelo usuário. Não reinseri-lo como etapa futura implícita. A simulação financeira de uma reimpressão, citada adiante, não é previsão de probabilidade de falha.

## 5. Calculadora: plano de reorganização proposto, sem implementação autorizada

### Contexto relatado

Já existem os modos `QUICK` e `FULL`. O modo rápido oculta custos da interface, mas não os remove do cálculo. `ScenarioSimulator` foi relatado como disponível apenas no modo `FULL`, no final da página, o que reduz a visibilidade da previsibilidade financeira. Também já existem templates e importação Bambu.

A proposta é organizar blocos na mesma tela, **sem wizard obrigatório**, preservando fórmulas e valores. O usuário autorizou detalhar este plano, não implementá-lo.

### 5.1 Produto e impressão

Mostrar nome do produto, quantidade de produtos finais, impressora padrão, material/cor, peso em gramas e tempo de impressão. Começar com uma bandeja; permitir adicionar filamentos, bandejas e repetições somente quando necessário.

Distinguir **produtos finais** de **componentes**: uma base e uma tampa podem formar um único produto. Evitar duplicação dos campos de material/cor. Dimensões podem ficar em detalhes opcionais; alterar dimensões não deve recalcular magicamente peso ou tempo sem dados que sustentem isso.

### 5.2 Acabamento e extras

Manter um resumo claro mesmo quando o bloco estiver recolhido. Informar embalagem e custos padrão aplicados. Abrir mão de obra e insumos quando necessário e oferecer uma opção explícita **“Sem acabamento”**.

### 5.3 Preço e previsibilidade próximos

Apresentar total, valor unitário, custo e lucro estimados próximos aos dados principais. Incluir:

- Resumo do desconto estimado conforme os parâmetros usados.
- Impacto financeiro de uma reimpressão, sem atribuir probabilidade de falha.
- Estoque com estados **suficiente**, **falta** ou **não verificado**.
- Acesso a **“Simular cenários”** também no modo rápido.

A simulação não pode alterar silenciosamente o orçamento. Quando faltarem dados essenciais, indicar que o resultado é parcial e quais dados faltam, evitando aparência de preço final concluído.

### 5.4 Cliente, revisão e finalização

Organizar cliente, imagem, observações e revisão. Apresentar pendências específicas e navegáveis para o campo correspondente. Separar campos obrigatórios, avisos e informações opcionais. Evitar mensagens genéricas que não ajudem o usuário a concluir.

### 5.5 Custos configurados e atalhos

Manter recolhidos, mas acessíveis por **“Editar”**, energia, depreciação, referências, reservas e margens. Indicar o que usa padrão e o que foi personalizado, com opção de restaurar. Editar um orçamento não deve mudar padrões globais.

Atalhos propostos: **“Novo orçamento”**, **“Usar modelo salvo”** e **“Preencher com Bambu Studio”**. Diferenciar claramente criar, editar e duplicar.

### Responsividade e direção visual a avaliar

No desktop, usar resumo lateral somente se couber sem prejudicar o formulário. No celular, avaliar barra compacta que não cubra campos nem teclado e cenários apresentados em cartões. Buscar aparência neutra, hierarquia clara, menos caixa alta, letras excessivamente pequenas e brilho. Cor deve vir acompanhada de texto para comunicar estados.

### Critérios e validação futura

Antes da implementação definitiva, preparar protótipos desktop/mobile nos estados vazio, preenchido e com pendências. Validar tarefas simples, com múltiplas bandejas e com acabamento. Comparar o esforço para concluir as tarefas. Verificar preservação de fórmulas/valores e dos fluxos de salvar, reabrir, duplicar e imprimir. Esses passos são recomendações de validação futura e **não foram realizados nesta consolidação**.

## 6. Orçamentos e pedidos: separar aprovação, produção e pagamento

### Problema confirmado

O usuário relata informações misturadas e uso de **“Faturado”** para indicar que o cliente aprovou. A empresa pode produzir antes de receber, com pagamento na entrega. Portanto, aprovação comercial, produção, entrega e recebimento precisam ser tratados como eventos distintos.

Manter as áreas existentes **Orçamentos** e **Pedidos**, sem criar um módulo duplicado.

### Referência técnica relatada

Em `useQuoteAdmin`, `handleApproveQuote` foi relatado como criando um pedido `PENDING_PAYMENT` e marcando o orçamento como `CONVERTED_TO_ORDER`. A interface usa “Faturado”/“Aprovar e faturar”, mas essa transição não significa pagamento recebido. Conferir os fluxos atuais antes de qualquer alteração.

### Fluxo proposto para orçamentos

Trocar a ação por **“Aprovar e criar pedido”**. Abas sugeridas:

- **Guardados:** ainda não enviados.
- **Aguardando resposta:** enviados ao cliente.
- **Convertidos em pedido:** preservados, com vínculo **“Ver pedido”**.
- **Encerrados:** recusados, cancelados ou arquivados, mantendo a distinção no registro.

Priorizar orçamentos abertos na visualização inicial. Na aprovação, revisar cliente, produto, quantidade, valor e prazo. Informar condição de pagamento: antecipado, na entrega ou em data combinada. Definir separadamente se a produção será liberada agora ou aguardará pagamento.

**Exemplo de comportamento requerido:** um pedido autorizado para produção com pagamento na entrega entra na fila sem ser marcado como recebido ou pago.

### Pedidos: produção e pagamento independentes

Kanban e tabela devem mostrar os **mesmos registros**. Fluxo visual de produção sugerido, ainda a avaliar:

**Aguardando liberação → Na fila → Em produção → Acabamento → Pronto → Entregue.**

Etapas técnicas atuais podem ser preservadas dentro da produção; não eliminar regras existentes sem análise. O fluxo final ainda precisa ser decidido.

Pagamento deve ter estado independente: **A receber**, **Parcialmente recebido** ou **Pago**, com total, valor recebido, saldo e condição de pagamento. **Aprovar, produzir ou entregar não marca pagamento como recebido.** Integrar as confirmações de pagamento já existentes.

Filtros propostos: fila, em produção, prontos, atrasados e entregues com saldo. Separar os indicadores de valores de propostas abertas dos valores a receber de pedidos, evitando mistura ou dupla contagem.

### Integridade, acessibilidade e aceitação

- Preservar histórico e vínculo entre orçamento e pedido; impedir conversão duplicada.
- Na migração de legados, nunca converter “Faturado” automaticamente em “Pago”.
- Conferir um caso de produção antes do pagamento e outro de entrega com saldo aberto.
- Refletir mudanças no mesmo registro em Kanban, tabela e detalhes.
- Usar rótulos textuais de produção/pagamento, filtros acessíveis e alternativas ao arraste.
- Apresentar os mesmos valores financeiros nas visualizações relacionadas.

### Referência visual ilustrativa

Foi criada anteriormente uma proposta visual com dados fictícios:

`/Users/reyvisonbraz/.codex/visualizations/2026/09/19/01a0b739-f95c-7c73-b3d4-1ed2f4e6b881/painel-orcamentos-pedidos.html`

Ela alterna Orçamentos e Pedidos, com Kanban e tabela. É uma referência de discussão, **não o site implementado, não dados reais e não evidência de testes**. Sua existência e seu funcionamento não foram verificados nesta consolidação. Não copiar automaticamente esse arquivo para o repositório.

## 7. Refinamento da proposta: corrigir o bloco “Valor da Proposta”

### Problema confirmado

O bloco acompanha a rolagem, sobrepõe itens e apresenta transparência que prejudica a leitura. A correção de sobreposição é prioridade.

### Solução de design a avaliar

Manter no formulário principal cliente, produto, especificações, observações e condições. Reservar uma coluna própria para quantidade, valor unitário, ajustes e total. Usar fundo opaco, contraste e borda discreta.

Se houver comportamento sticky, limitá-lo ao contêiner e considerar o cabeçalho, sem invadir outros conteúdos. Se o resumo for alto demais para a área disponível, deixá-lo no fluxo normal. No celular, manter o resumo no fluxo e avaliar uma barra compacta **“Valor total / Revisar proposta”**, sempre com espaço reservado para não cobrir conteúdo.

Dar destaque ao total e peso visual secundário às demais informações. Distinguir valores editáveis e calculados. **Salvar** e **aprovar** devem ser ações diferentes.

### Critérios de aceitação

Não haver sobreposição ao rolar, mudar tamanho de tela, usar zoom ou abrir propostas longas. O resumo deve continuar legível e acessível sem ocultar foco, campos ou teclado. Os valores exibidos devem coincidir com os valores do documento da proposta.

## 8. Pedidos: imagens e identificação úteis

### Problema confirmado e comportamento proposto

O usuário relata que enxerga principalmente o protocolo e sente falta da foto. Mostrar miniatura estável, sem distorcer a imagem, com nome do produto em destaque. Exibir cliente, quantidade, prazo e indicação de atraso, separando produção e pagamento. O protocolo deve ficar em nível secundário, com ação para copiar.

Preservar a imagem do produto, orçamento ou item ao converter em pedido; conferir a origem e o vínculo atuais. Para vários itens, apresentar miniatura principal com indicação de outros itens e imagens individuais nos detalhes.

Sem foto, usar placeholder neutro **“Sem imagem”**; nunca preencher com foto aleatória. Erro ao carregar imagem não deve bloquear o pedido. Permitir ampliar a imagem nos detalhes sem alterar a etapa de produção.

### Responsividade, acessibilidade e aceitação

Reservar dimensões para miniaturas, adequar cartões/linhas ao celular e usar texto alternativo adequado. Controles para copiar e ampliar devem ter rótulo e foco. Conferir pedidos com foto, sem foto, com erro de imagem e com múltiplos itens, inclusive após conversão de orçamento.

## 9. Cache e carregamento de imagens

### Necessidade confirmada

Evitar baixar novamente imagens do Firebase em toda navegação entre pedidos e orçamentos. Antes de implementar, verificar requisições e cabeçalhos atuais, distinguindo **consultas de dados** de **downloads de imagens**.

### Estratégia proposta, dependente de diagnóstico

- Usar miniaturas em listas; carregar imagem maior apenas nos detalhes ou ao ampliar.
- Aproveitar cache HTTP do navegador e URLs estáveis enquanto a foto não mudar.
- Adotar lazy loading fora da área visível e reutilizar imagens entre telas.
- Considerar cache persistente adicional somente se houver necessidade demonstrada.
- Atualizar versão ou referência quando uma foto for substituída, evitando imagem obsoleta.
- Definir limites e limpeza de armazenamento, respeitando permissões e troca de usuário.
- Reservar dimensões para evitar saltos de layout, mostrar carregamento discreto e preservar conteúdo ao voltar à tela.

### Critérios de aceitação e limites

Comparar a rede no primeiro e no segundo acesso, na navegação entre telas e após substituir uma imagem. Verificar erros e troca de usuário. Confirmar que a imagem nova aparece sem manter conteúdo antigo indevidamente e que o acesso respeita as permissões.

Não prometer zero requisições: o navegador pode revalidar recursos ou remover itens do cache. A melhoria deve ser demonstrada por observação do comportamento real de rede; nenhum resultado de medição está registrado aqui.

## 10. Abertura de detalhes e movimentação de pedidos

### Problema confirmado

Hoje é necessário um clique muito preciso para abrir o protocolo/“Ledger”. A área de interação deve ser mais fácil de encontrar e usar.

### Abertura e retorno propostos

Tornar a área principal do cartão ou linha clicável, com feedback de mouse e foco. Manter um botão **“Ver pedido”** e acesso por teclado. Separar claramente selecionar, abrir, copiar e arrastar. Ações específicas não devem propagar uma abertura indevida dos detalhes.

Ao fechar, restaurar posição de rolagem, filtros e visualização anterior.

### Organização dos detalhes

- **Identificação:** foto, produto, cliente, quantidade e protocolo.
- **Produção:** etapa, prazo e próxima ação.
- **Itens:** materiais, cores, dimensões e acabamento.
- **Pagamento:** total, recebido, saldo e condição.
- **Observações:** informações úteis à execução.
- **Histórico:** alterações e eventos relacionados ao pedido.

### Movimentação acessível e integridade

Permitir movimentação pelo Kanban e por **“Alterar etapa”** na tabela, nos detalhes e no celular, sem exigir drag and drop. Informar o destino antes de efetivar a ação. Registrar etapa anterior, etapa nova, data e responsável. Confirmar que a alteração foi salva e reverter a exibição ao estado anterior se ocorrer erro, com mensagem compreensível.

Mudar produção não altera pagamento. Respeitar efeitos atuais sobre estoque e cancelamento. Sincronizar todas as visões do mesmo registro.

### Critérios de aceitação

Abrir pelo cartão/linha, botão e teclado; copiar protocolo sem abrir detalhes; mover por arraste e pela alternativa acessível; verificar retorno aos filtros e posição anteriores; conferir histórico, falha ao salvar e consistência entre tabela/Kanban/detalhes. A ampliação da imagem não muda a etapa, e a mudança de etapa não marca pagamento.

## 11. Ordem sugerida de trabalho futuro

Esta ordem é uma recomendação de planejamento, não autorização de execução.

1. **Diagnosticar e preservar regras atuais:** conferir código referido, estados, fórmulas, vínculo orçamento/pedido, estoque/cancelamento e confirmação de pagamentos. Registrar o comportamento de rede antes de mudar cache.
2. **Corrigir a sobreposição de “Valor da Proposta”:** resolver leitura e acesso aos campos em desktop, celular, zoom e propostas longas.
3. **Melhorar identificação e abertura dos pedidos:** imagens, nome do produto, protocolo secundário, área clicável e detalhes organizados.
4. **Separar produção e pagamento:** revisar nomenclaturas, conversão, liberação, condições, filtros e tratamento de legados; definir o fluxo final antes de migrar estados.
5. **Disponibilizar movimentação acessível:** mesma ação em Kanban, tabela, detalhes e celular, preservando histórico e efeitos existentes.
6. **Otimizar imagens conforme diagnóstico:** miniaturas, estabilidade de URLs e cache; verificar primeiro/segundo acesso, substituição e erro.
7. **Atender às solicitações diretas da calculadora:** limpar sem salvar e importar por imagem com revisão, reaproveitando recursos existentes.
8. **Prototipar a reorganização da calculadora:** desktop/mobile e estados vazio/preenchido/pendências; avaliar tarefas simples, múltiplas bandejas e acabamento antes de implementar.
9. **Refinar a Home e a localização:** validar copy e mídia, escolher direção visual e preparar estado de localização pendente; ativar mapa real somente com dados confirmados.
10. **Verificar os fluxos completos:** salvar, reabrir, duplicar, imprimir, aprovar/criar pedido, liberar produção, mover, entregar e registrar recebimentos, sem perda ou mistura de estados.

As melhorias de Home e os dados de localização podem ser preparados em paralelo ao planejamento administrativo, se houver autorização futura e isso não atrapalhar as correções prioritárias.

## 12. Pendências para a próxima IA e para o usuário

### Informações e decisões ainda necessárias

- Endereço completo, ponto exato e link da localização.
- Copy final da Home, fotos/vídeos reais e destinos dos botões.
- Paleta e direção visual definitivas; o visual neutro é uma proposta em avaliação.
- Fluxo final de produção e mapeamento das etapas técnicas atuais.
- Política concreta de liberação de produção e apresentação das condições de pagamento, respeitando produção antes do recebimento quando autorizada.
- Arranjo final dos blocos da calculadora e do resumo da proposta após avaliação de protótipos.

### Conferências técnicas ainda necessárias

- Estado atual de `heroCopyOptions`, `AnimatedHeroCopy`, `SlicerPasteBox`, `ScenarioSimulator`, modos `QUICK`/`FULL`, templates e importação Bambu.
- Conversão em `useQuoteAdmin`/`handleApproveQuote`, estados legados e prevenção de duplicidade.
- Origem/persistência das imagens na conversão e comportamento atual de cache/headers.
- Efeitos de movimentações sobre estoque e cancelamento; integrações de pagamento já existentes.
- Critérios de aceitação descritos em cada seção, que ainda precisam ser executados em trabalho futuro.

## 13. Limites para uso deste documento

A próxima IA deve preservar a distinção entre requisitos confirmados e soluções propostas. Este documento não comprova implantação nem testes e não concede, por si só, autorização para programar, publicar ou alterar serviços/configurações. Não incluir análise STL/previsão automática de falhas. Não tratar “Faturado” como “Pago”, não inventar endereço, não usar preços fictícios como dados reais e não modificar fórmulas ou padrões globais silenciosamente.
