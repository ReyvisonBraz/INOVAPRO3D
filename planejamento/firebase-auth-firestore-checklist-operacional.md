# Checklist Operacional - Firebase Auth, Firestore e Primeiro Admin

Data: 2026-05-25

## Objetivo

Deixar claro o que precisa ser feito para:

- permitir login com Google no site;
- permitir que clientes se cadastrem automaticamente;
- permitir acesso do dono ao painel admin;
- usar Firestore como banco de dados principal;
- separar o que ja esta programado do que ainda precisa configurar ou implementar.

## Estado Atual do Codigo

O projeto ja possui a base principal programada.

### Login com Google

Arquivo principal:

- `src/contexts/AuthContext.tsx`

O codigo ja usa:

- `Firebase Auth`;
- `GoogleAuthProvider`;
- `signInWithPopup`;
- `onAuthStateChanged`.

Ou seja: o botao de login Google ja pode funcionar se o Firebase estiver configurado corretamente.

### Cadastro Automatico do Cliente

Quando alguem loga com Google pela primeira vez, o app tenta criar automaticamente:

```txt
users/{uid}
```

Com dados parecidos com:

```json
{
  "email": "email-do-cliente@gmail.com",
  "name": "Nome do Cliente",
  "photoURL": "foto-google",
  "role": "CUSTOMER",
  "createdAt": "timestamp",
  "loyaltyPoints": 0
}
```

Isso significa que nao precisa criar uma tela separada de cadastro agora. O login Google ja vira cadastro.

### Acesso Admin

O painel admin depende do campo:

```txt
users/{uid}.role
```

Valores esperados:

```txt
CUSTOMER
ADMIN
OPERATOR
```

Cliente comum recebe:

```txt
CUSTOMER
```

O dono precisa receber manualmente:

```txt
ADMIN
```

## Configuracao Necessaria no Firebase Console

Projeto Firebase atual no codigo:

```txt
digitalsantamaria-2ced4
```

Arquivo de configuracao:

```txt
firebase-applet-config.json
```

Database ID usado pelo projeto:

```txt
ai-studio-a035c2cd-23f5-4e2c-95bb-cb81f7e2ec04
```

## Passo 1 - Ativar Login Google

No Firebase Console:

1. Entrar no projeto `digitalsantamaria-2ced4`.
2. Ir em `Authentication`.
3. Ir em `Sign-in method`.
4. Ativar o provedor `Google`.
5. Escolher um e-mail de suporte do projeto.
6. Salvar.

## Passo 2 - Configurar Dominios Autorizados

No Firebase Console:

1. Ir em `Authentication`.
2. Ir em `Settings`.
3. Abrir `Authorized domains`.
4. Confirmar/adicionar:

```txt
localhost
```

Depois, quando o site tiver dominio real, adicionar tambem o dominio final, por exemplo:

```txt
seudominio.com.br
www.seudominio.com.br
```

Sem isso, o login Google pode falhar no site publicado.

## Passo 3 - Confirmar Firestore Database

No Firebase Console:

1. Ir em `Firestore Database`.
2. Confirmar se o banco existe.
3. Confirmar se o Database ID e:

```txt
ai-studio-a035c2cd-23f5-4e2c-95bb-cb81f7e2ec04
```

Se o banco tiver outro ID, o arquivo `firebase-applet-config.json` precisa ser ajustado.

## Passo 4 - Publicar as Regras Firestore

Arquivo local:

```txt
firestore.rules
```

Essas regras controlam:

- quem pode criar usuario;
- quem pode virar admin;
- quem pode criar pedido;
- quem pode editar pedido;
- quem pode ler painel admin;
- quem pode cadastrar produto;
- quem pode criar ticket.

As regras atuais ja bloqueiam cliente comum de virar admin sozinho.

No Firebase Console:

1. Ir em `Firestore Database`.
2. Ir em `Rules`.
3. Copiar o conteudo de `firestore.rules`.
4. Colar no editor de rules.
5. Publicar.

Alternativa futura:

- instalar Firebase CLI;
- configurar `firebase.json`;
- fazer deploy via terminal.

Isso ainda nao esta configurado no projeto.

## Passo 5 - Criar o Primeiro Admin

Este e o passo mais importante para voce acessar o painel.

### Fluxo Manual Recomendado Agora

1. Rodar o site localmente:

```bash
npm run dev
```

2. Abrir:

```txt
http://localhost:3000
```

3. Fazer login com o seu Google.
4. O app vai criar voce em:

```txt
users/{seu_uid}
```

5. Ir no Firebase Console.
6. Abrir `Firestore Database`.
7. Entrar na colecao:

```txt
users
```

8. Achar o documento do seu usuario pelo e-mail.
9. Alterar:

```txt
role: "CUSTOMER"
```

Para:

```txt
role: "ADMIN"
```

10. Salvar.
11. Sair e entrar novamente no site, se necessario.
12. Abrir:

```txt
http://localhost:3000/admin
```

Agora o painel admin deve liberar acesso.

## Passo 6 - Testar Cliente Comum

Criar ou usar outro e-mail Google que nao seja o admin.

Teste esperado:

1. Cliente consegue logar.
2. Cliente aparece na colecao `users`.
3. Cliente fica com:

```txt
role: "CUSTOMER"
```

4. Cliente nao consegue acessar `/admin`.
5. Cliente consegue navegar no catalogo.
6. Cliente consegue criar pedido/orcamento conforme regras.

## Banco de Dados Necessario

Sim, o projeto precisa de banco de dados.

O banco usado atualmente e:

```txt
Firestore
```

Colecoes principais previstas:

```txt
users
products
materials
showcase
orders
quotes
tickets
faqs
settings
logs
customers
coupons
```

## O Que Cada Colecao Guarda

### users

Usuarios autenticados pelo Google.

Campos importantes:

- `email`;
- `name`;
- `photoURL`;
- `role`;
- `createdAt`;
- `loyaltyPoints`;
- `phone`;
- `addresses`.

### products

Produtos do catalogo.

Campos importantes:

- `name`;
- `description`;
- `basePrice`;
- `images`;
- `category`;
- `active`;
- `stock`;
- `modelUrl`;
- `sourceUrl`;
- `technical`;
- `baseDimensions`.

### materials

Materiais de impressao.

Campos importantes:

- `name`;
- `type`;
- `color`;
- `pricePerKg`;
- `priceMult`;
- `inStock`.

### orders

Pedidos criados pelo checkout ou pelo admin.

Campos importantes:

- `userId`;
- `userName`;
- `userEmail`;
- `items`;
- `total`;
- `shippingAddress`;
- `status`;
- `createdAt`;
- `trackingCode`.

### quotes

Orcamentos customizados.

Campos importantes:

- `userId`;
- `userName`;
- `userEmail`;
- `fileName`;
- `materialId`;
- `infill`;
- `estimatedPrice`;
- `status`;
- `createdAt`.

### tickets

Mensagens de suporte.

Campos importantes:

- `subject`;
- `message`;
- `email`;
- `phone`;
- `status`;
- `createdAt`.

### settings

Configuracoes globais.

Exemplos:

- banner promocional;
- frete;
- modo manutencao;
- valor minimo de pedido.

## O Que Ja Esta Programado

- Login com Google.
- Criacao automatica de usuario cliente.
- Campo `role` no perfil.
- Protecao do admin por role.
- Regras Firestore para bloquear escalada de permissao.
- Criacao de pedidos no Firestore.
- Criacao de orcamentos no Firestore.
- Cadastro de produtos pelo admin.
- Importador de metadados de produto por link.
- Leitura publica de catalogo/produtos/materiais/vitrine/FAQ.

## O Que Ainda Precisa Configurar

- Ativar Google Auth no Firebase Console.
- Adicionar dominios autorizados.
- Confirmar Database ID do Firestore.
- Publicar `firestore.rules`.
- Fazer login com o dono.
- Alterar o dono para `role: "ADMIN"` no Firestore.
- Criar produtos/materiais iniciais.

## O Que Ainda Precisa Programar Antes de Producao

### Pagamento Real

Hoje o Pix ainda nao cria cobranca real.

Ainda precisa:

- backend para criar cobranca Pix;
- integracao com Mercado Pago ou outro provedor;
- webhook para confirmar pagamento;
- atualizacao de pedido pelo servidor;
- impedir qualquer confirmacao de pagamento pelo cliente.

### Upload Real de Arquivos 3D

Hoje o projeto trabalha com links/metadados.

Para upload real de STL/3MF/OBJ, sera necessario:

- Firebase Storage ou outro storage;
- regras de Storage;
- limite de tamanho;
- validacao de extensao;
- associar arquivo ao orcamento.

### Seed Inicial

Seria util criar um script ou rotina para cadastrar:

- materiais padrao;
- produtos exemplo;
- configuracoes globais;
- FAQs iniciais.

### Processo Melhor Para Admin

Hoje o primeiro admin e manual.

Depois podemos implementar:

- script local seguro para promover admin;
- painel de usuarios para admin promover operadores;
- custom claims no Firebase Auth, se necessario.

## Checklist Rapido

- [ ] Ativar Google Auth no Firebase.
- [ ] Adicionar `localhost` em Authorized Domains.
- [ ] Confirmar banco Firestore e Database ID.
- [ ] Publicar `firestore.rules`.
- [ ] Rodar `npm run dev`.
- [ ] Fazer login com sua conta Google.
- [ ] Promover seu usuario para `ADMIN` no Firestore.
- [ ] Testar `/admin`.
- [ ] Testar login com cliente comum.
- [ ] Criar produtos e materiais iniciais.
- [ ] Testar catalogo.
- [ ] Testar checkout/orcamento.

## Riscos se Pular Algum Passo

### Google Auth nao ativado

Login nao funciona.

### Dominio nao autorizado

Login funciona localmente, mas falha no site publicado.

### Rules nao publicadas

O comportamento real do Firestore pode ser diferente do codigo local.

### Primeiro admin nao criado

Ninguem consegue acessar o painel admin.

### Pagamento real nao implementado

Cliente pode criar pedido, mas ainda nao existe confirmacao automatica de pagamento.

## Proxima Acao Recomendada

Fazer a configuracao do Firebase Console e testar este fluxo:

1. login com sua conta;
2. promover para admin;
3. acessar `/admin`;
4. criar um produto teste;
5. logar com outro e-mail como cliente;
6. tentar comprar/solicitar orcamento.

Depois disso, o proximo desenvolvimento recomendado e:

1. seed inicial de materiais/produtos;
2. processo seguro de primeiro admin;
3. upload/storage de arquivos 3D;
4. pagamento real com webhook.
