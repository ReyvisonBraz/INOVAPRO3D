# Fase 7: Admin Avançado

Automação de custos e inteligência de estoque.

## 📊 Detalhamento dos Módulos

### 1. Controle de Materiais (Estoque)
- Cadastro de Bobinas: `Marca: Creality | Cor: Amarelo | Peso: 1000g`.
- **Baixa Automática:** Se o Pedido #001 consumiu 45g de PLA Amarelo, o sistema subtrai 45g da bobina ativa vinculada àquele pedido.
- **Alertas de Reposição:** Notificações quando uma cor popular chega a menos de 150g.

### 2. Gestão de Parque de Máquinas
- Registro de Impressoras (Bambu Lab, Ender 3, etc.).
- **Monitor de Ocupação:** Se a Impressora A está no status `PRINTING`, o admin não consegue alocar outro pedido para ela até o término.

### 3. Relatórios Financeiros (DRE)
- Visualização de Lucro Bruto: `Receita - (Custo Material + Taxa MP + Frete)`.
- Gráficos de barra por categoria de produto (o que vende mais?).

## 📌 Meta de Eficiência
- Tornar o negócio escalável, evitando desperdícios de material e atrasos por falta de estoque.
