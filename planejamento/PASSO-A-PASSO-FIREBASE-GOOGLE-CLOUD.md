# Passo a Passo - Firebase / Google Cloud para INOVAPRO3D

Este documento lista o que precisa ser configurado fora do codigo, diretamente na conta Google/Firebase, para o sistema funcionar com login, banco de dados e permissoes.

## 1. Criar ou abrir o projeto Firebase

1. Acesse:
   - https://console.firebase.google.com/
2. Entre com a conta Google que vai ser dona do projeto.
3. Clique em **Adicionar projeto** se ainda nao existir.
4. Nome sugerido:
   - `INOVAPRO3D`
5. O Google Analytics pode ficar desativado no inicio, se voce quiser simplificar.
6. Finalize a criacao do projeto.

Se o projeto ja existir, apenas abra ele no Firebase Console.

## 2. Criar o app web no Firebase

1. Dentro do projeto Firebase, va na tela inicial do projeto.
2. Clique no icone de web:
   - `</>`
3. Nome do app sugerido:
   - `INOVAPRO3D Web`
4. Nao precisa configurar Hosting agora, a menos que voce queira publicar pelo Firebase Hosting.
5. Depois de criar, o Firebase vai mostrar um bloco de configuracao parecido com:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

6. Copie esses dados.
7. Coloque os dados no arquivo:

```txt
firebase-applet-config.json
```

O formato esperado e parecido com:

```json
{
  "apiKey": "SUA_API_KEY",
  "authDomain": "SEU_PROJETO.firebaseapp.com",
  "projectId": "SEU_PROJECT_ID",
  "storageBucket": "SEU_PROJETO.appspot.com",
  "messagingSenderId": "SEU_MESSAGING_SENDER_ID",
  "appId": "SEU_APP_ID"
}
```

## 3. Ativar Firebase Authentication

1. No menu lateral do Firebase, clique em **Authentication**.
2. Clique em **Comecar**.
3. Va em **Sign-in method** ou **Metodo de login**.
4. Ative o provedor:
   - **E-mail/senha**
5. Salve.

Opcional depois:

- Ativar login com Google.
- Configurar recuperacao de senha.
- Configurar dominios autorizados.

Para o primeiro funcionamento do sistema, e-mail/senha ja basta.

## 4. Criar o Firestore Database

1. No menu lateral, clique em **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha **modo de producao**, se disponivel.
4. Escolha uma regiao.

Sugestoes de regiao:

- `southamerica-east1`, se disponivel.
- Se nao aparecer, escolha uma regiao proxima ou a padrao recomendada pelo Firebase.

Depois de criado, o banco vai aparecer vazio. Isso e normal.

## 5. Publicar as regras do Firestore

O projeto ja tem um arquivo de regras:

```txt
firestore.rules
```

Voce precisa aplicar essas regras no Firebase.

### Opcao A - Pelo Firebase Console

1. Abra **Firestore Database**.
2. Va na aba **Regras**.
3. Apague o conteudo atual.
4. Copie o conteudo do arquivo local:

```txt
firestore.rules
```

5. Cole no editor de regras do Firebase.
6. Clique em **Publicar**.

### Opcao B - Pela Firebase CLI

Esta opcao fica para depois, se formos configurar deploy pelo terminal.

Comando esperado futuramente:

```bash
firebase deploy --only firestore:rules
```

## 6. Criar o primeiro usuario

1. Rode o site localmente.
2. Crie uma conta normal pelo proprio site.
3. Depois va no Firebase Console.
4. Abra **Authentication**.
5. Copie o `UID` do usuario criado.
6. Abra **Firestore Database**.
7. Procure ou crie a colecao:

```txt
users
```

8. Dentro dela, abra ou crie um documento com o ID igual ao UID do usuario.
9. Configure esse usuario como admin.

Campos importantes:

```json
{
  "email": "seu-email@exemplo.com",
  "role": "ADMIN"
}
```

O campo mais importante e:

```json
"role": "ADMIN"
```

Sem isso, o usuario pode logar, mas nao deve ter acesso administrativo completo.

## 7. Colecoes principais esperadas

O sistema usa ou deve usar colecoes como:

```txt
users
orders
quotes
products
materials
tickets
logs
faq
showcase
```

Nem todas precisam ser criadas manualmente no inicio. Muitas podem ser criadas automaticamente quando o sistema salvar dados.

Mas as mais importantes para testar primeiro sao:

- `users`
- `products`
- `materials`
- `orders`
- `quotes`

## 8. O que voce precisa me passar

Depois de configurar, me avise:

1. Se o projeto Firebase ja foi criado.
2. Se o Authentication por e-mail/senha esta ativo.
3. Se o Firestore Database foi criado.
4. Se voce ja copiou a configuracao para `firebase-applet-config.json`.
5. Qual e o e-mail do usuario que deve virar admin.

Nao envie senha.

Tambem nao precisa me mandar print se nao quiser. Basta confirmar cada item.

## 9. O que eu valido depois

Depois que voce fizer a parte do Firebase, eu consigo validar no projeto:

1. Se o arquivo `firebase-applet-config.json` esta no formato correto.
2. Se o site sobe com:

```bash
npm run dev
```

3. Se o build passa:

```bash
npm run build
```

4. Se o typecheck passa:

```bash
npm run lint
```

5. Se cadastro e login funcionam.
6. Se usuario comum nao acessa admin.
7. Se usuario com `role: ADMIN` acessa admin.
8. Se pedidos, orcamentos, produtos e materiais salvam no Firestore.
9. Se as regras do Firestore estao bloqueando ou permitindo corretamente.

## 10. Ordem recomendada para voce seguir

1. Criar ou abrir o projeto Firebase.
2. Criar app web e copiar configuracao.
3. Colocar configuracao em `firebase-applet-config.json`.
4. Ativar Authentication por e-mail/senha.
5. Criar Firestore Database.
6. Publicar `firestore.rules`.
7. Criar uma conta pelo site.
8. Transformar essa conta em admin no Firestore.
9. Me avisar para eu testar o fluxo completo.

## Observacao importante

Antes de usar com cliente real, o fluxo de pagamento ainda precisa ser definido com backend/webhook confiavel. O README do projeto ja marca pagamento Pix como pendente/simulado.

