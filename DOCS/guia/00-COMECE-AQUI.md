# 📘 Guia do Projeto INOVAPRO3D — Comece Aqui

> Documentação didática escrita para quem **não programa ainda**, mas quer entender
> como o próprio projeto funciona por dentro.

## Como ler este guia

Leia na ordem. Cada arquivo é curto e explica um tema:

| Arquivo | O que você vai aprender |
|---|---|
| **01-VISAO-GERAL.md** | O que é o projeto, quais tecnologias usa e por quê |
| **02-ARQUITETURA.md** | Como as pastas se organizam e como as partes conversam entre si |
| **03-BANCO-DE-DADOS.md** | Onde os dados ficam guardados (produtos, pedidos, usuários...) |
| **04-CHAVES-E-VARIAVEIS.md** | Quais senhas/chaves o projeto usa e onde elas ficam |
| **05-SEGURANCA.md** | O que está protegido, o que está vulnerável, e o que corrigir |
| **06-QUALIDADE-DO-CODIGO.md** | O que está bem escrito, o que precisa melhorar (refatoração) |
| **07-PROXIMOS-PASSOS.md** | Em que ponto estamos e o que focar daqui pra frente |

## Resumo em 30 segundos

O INOVAPRO3D é uma **loja virtual de impressão 3D** com:

- 🏪 **Site público** — catálogo, calculadora de preços, checkout com cartão/PIX
- 👤 **Área do cliente** — login com Google, acompanhamento de pedidos
- 🛠️ **Painel admin** — gerenciar produtos, pastas/categorias, pedidos, orçamentos, CRM, suporte

Tudo roda com:
- **React** (a "cara" do site — o que aparece na tela)
- **Firebase** (o "cérebro de dados" — banco de dados, login, armazenamento de imagens)
- **Express** (um mini-servidor próprio — pagamentos Stripe, notificações Telegram)

## Glossário rápido (termos que aparecem o tempo todo)

| Termo | Significado simples |
|---|---|
| **Frontend** | Tudo que o usuário vê e clica (telas, botões) |
| **Backend** | O que roda "nos bastidores" no servidor (pagamentos, notificações) |
| **Componente** | Um pedaço reutilizável de tela. Ex: o card de produto é um componente usado várias vezes |
| **Firestore** | O banco de dados do Firebase. Guarda produtos, pedidos, usuários em "coleções" |
| **Coleção** | Como uma "gaveta" no banco de dados. Ex: a gaveta `products` guarda todos os produtos |
| **API / Endpoint** | Uma "porta" no servidor que o site usa pra pedir coisas. Ex: `/api/stripe/...` cria um pagamento |
| **Variável de ambiente** | Uma configuração secreta (senha, chave) que fica fora do código, num arquivo `.env` |
| **Deploy** | Publicar o site na internet (no caso, pela Vercel) |
| **Commit / Push** | Salvar uma versão do código (commit) e enviá-la pro GitHub (push) |
