# -*- coding: utf-8 -*-
"""
Dados da auditoria de segurança do INOVAPRO3D.

Separado do gerador de PDF de propósito: revisar/atualizar um achado não deve
exigir mexer em layout, e regerar o relatório depois de corrigir algo é só
editar este arquivo e rodar `gerar_relatorio.py` de novo.
"""

PROJETO = "INOVAPRO3D"
DATA_AUDITORIA = "1 de setembro de 2026"
COMMIT = "e099126"

# Paleta pedida na especificação do relatório.
CORES = {
    "critica": "#B91C1C",
    "alta": "#EA580C",
    "media": "#D97706",
    "baixa": "#2563EB",
    "informativa": "#64748B",
    "forte": "#059669",
}

ROTULO_SEVERIDADE = {
    "critica": "CRÍTICA",
    "alta": "ALTA",
    "media": "MÉDIA",
    "baixa": "BAIXA",
    "informativa": "INFO",
    "forte": "FORTE",
}

STACK = [
    ("Linguagem", "TypeScript (ESM), Node.js 22"),
    ("Frontend", "React 19 + Vite 6 + React Router 7 + Tailwind 4"),
    ("Backend", "Express 4 (self-host, <b>server.ts</b>) e Vercel Serverless Functions (<b>api/</b>) — a Vercel é o runtime de produção"),
    ("Persistência", "Cloud Firestore acessado direto do navegador (SDK web) + Firebase Admin SDK no servidor"),
    ("Autorização", "Firestore Security Rules (<b>firestore.rules</b>) + Storage Rules (<b>storage.rules</b>) — não há ORM nem camada de query no servidor"),
    ("Autenticação", "Firebase Auth (Google Sign-In); papel em <b>users/{uid}.role</b>, sem custom claims"),
    ("Pagamentos", "Mercado Pago (Pix) e Stripe"),
    ("Deploy", "Vercel (<b>vercel.json</b>) + GitHub Actions; sem Docker, Helm ou Terraform"),
]

METODOLOGIA = [
    (
        "1. Banco sem tranca",
        "O projeto não usa ORM: o navegador fala direto com o Firestore, então o "
        "<b>mecanismo de isolamento é o arquivo de regras</b>. A categoria foi mapeada para "
        "uma leitura linha a linha de <b>firestore.rules</b> (367 linhas) e <b>storage.rules</b> "
        "(55 linhas), cruzando cada <i>match</i> com as coleções realmente usadas no código.",
    ),
    (
        "2. Permissão definida no navegador",
        "Cada gate de papel do frontend (<b>ProtectedRoute requireAdmin</b>, <b>profile?.role === \"ADMIN\"</b>) "
        "foi cruzado com o ponto que executa a operação. Como as escritas administrativas vão "
        "direto ao Firestore, o equivalente server-side é a função <b>isAdmin()</b> das regras — "
        "verificada coleção por coleção.",
    ),
    (
        "3. IDOR",
        "Percorridos <b>todos</b> os 16 handlers de rota do backend (11 funções serverless em "
        "<b>api/</b> e 12 rotas Express em <b>server.ts</b>), conferindo, em cada um que recebe "
        "um identificador de objeto, se há checagem de posse antes de ler ou escrever.",
    ),
    (
        "4. Chaves expostas",
        "Varredura de código, configs, <b>vercel.json</b>, workflows do GitHub Actions, scripts, "
        "documentação e <b>todo o histórico do git</b> (todos os commits, todas as refs). "
        "Também foi inspecionado o bundle compilado em <b>dist/assets/</b> à procura de segredos "
        "de servidor que tivessem vazado para o navegador.",
    ),
    (
        "5. Inputs sem tratamento (XSS)",
        "Busca por <b>dangerouslySetInnerHTML</b>, <b>innerHTML</b>, <b>outerHTML</b>, "
        "<b>insertAdjacentHTML</b>, <b>eval</b>, <b>new Function</b> e <b>document.write</b> no frontend; "
        "e, no servidor, rastreio de todo dado de origem externa que entra em HTML de e-mail ou "
        "em mensagem do Telegram (ambos os canais interpretam markup).",
    ),
]

# ─────────────────────────────────────────────────────────────────────────────
# ACHADOS
# ─────────────────────────────────────────────────────────────────────────────

ACHADOS = [
    {
        "id": "A1",
        "severidade": "alta",
        "categoria": "1. Banco sem tranca (isolamento de dono)",
        "titulo": "Anexos de orçamento com leitura pública no Firebase Storage",
        "arquivo": "storage.rules:33-36",
        "codigo": """// Imagens opcionais anexadas a orçamentos salvos pela calculadora.
match /quotes/{allPaths=**} {
  allow read: if true;                    // ← qualquer pessoa, sem login
  allow write: if isAdmin() && isImage() && request.resource.size < 10 * 1024 * 1024;
}""",
        "descricao": (
            "O documento do orçamento no Firestore é corretamente restrito ao dono ou ao admin "
            "(<b>firestore.rules:361-365</b>), mas o <b>anexo correspondente no Storage é público</b>. "
            "O upload grava em <b>quotes/{uid}/{timestamp}-{nome}.{ext}</b> (<b>src/lib/quotes.ts:223</b>), "
            "então o caminho carrega o UID do cliente e o nome original do arquivo."
        ),
        "explorabilidade": (
            "Nas Storage Rules, <b>read</b> concede <b>get</b> e <b>list</b>. Com leitura liberada, um "
            "visitante não autenticado pode <b>enumerar o prefixo quotes/ com listAll()</b> e baixar "
            "todas as imagens — sem precisar adivinhar URL. Não depende de feature flag nem de "
            "configuração insegura: é o estado publicado da regra."
        ),
        "impacto": (
            "Vazamento do portfólio de peças e projetos dos clientes, dos nomes de arquivo enviados "
            "e da correlação UID → peças. Para uma operação B2B de impressão 3D, isso expõe trabalho "
            "de terceiros sob sigilo comercial."
        ),
        "correcao": (
            "Trocar <b>allow read: if true</b> por <b>allow read: if isAdmin()</b> nesse bloco. Se a "
            "imagem precisar ser exibida ao cliente dono, restringir ao UID do próprio caminho "
            "(<b>request.auth.uid == uid</b> capturando o segmento) em vez de liberar o prefixo inteiro. "
            "As demais pastas (products, showcase, categories, printers, company) são conteúdo de "
            "vitrine e podem seguir públicas."
        ),
        "aceite": [
            "`storage.rules` deixa de conter `allow read: if true` no bloco `quotes/`",
            "Requisição anônima de `listAll()` sobre `quotes/` retorna erro de permissão",
            "Download anônimo de uma URL conhecida de `quotes/` retorna 403",
            "O admin continua abrindo a imagem no painel de orçamentos sem regressão",
            "Teste de regra do Storage cobrindo negação anônima e permissão do admin",
        ],
    },
    {
        "id": "A2",
        "severidade": "media",
        "categoria": "4. Superfície de abuso / configuração de deploy",
        "titulo": "Endpoint anônimo de produção grava no Firestore sem nenhum rate limit",
        "arquivo": "api/report-error.ts:20-46",
        "codigo": """export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { /* ... */ }
  try {
    const { valid, data, telegramText } = buildErrorReport(req.body || {});
    if (!valid) { /* ... */ }
    let id: string | null = null;
    if (isAdminSdkConfigured()) {
      const ref = await getAdminDb().collection("errorReports").add(data);  // grava sem auth
      id = ref.id;
    }
    await notifyTelegram(telegramText + ...);   // dispara no canal de operacao""",
        "descricao": (
            "A rota é anônima por desenho (erro acontece para visitante deslogado) e escreve no "
            "Firestore via Admin SDK, além de disparar mensagem no Telegram. A versão Express da "
            "mesma rota é protegida por <b>rateLimit(20)</b> (<b>server.ts:671</b>), mas <b>a função "
            "serverless — que é o runtime de produção na Vercel — não tem limitador algum</b>."
        ),
        "explorabilidade": (
            "Basta um laço de POSTs com corpo <b>{\"message\":\"x\"}</b>. Nenhum token, nenhum header "
            "especial. Cada requisição cria um documento novo em <b>errorReports</b> (via <b>.add()</b>, "
            "sem deduplicação) e envia uma mensagem ao canal de operação."
        ),
        "impacto": (
            "Inflação ilimitada da coleção <b>errorReports</b> (custo de escrita e armazenamento no "
            "Firestore), inundação do canal do Telegram até o bot ser limitado pela API, e "
            "afogamento de relatos legítimos — o painel de erros do admin fica inutilizável."
        ),
        "correcao": (
            "Portar o limitador para a função serverless — o mesmo padrão já usado em "
            "<b>api/csp-report.ts:34-50</b> — e, para valer sob escala horizontal, ancorá-lo em "
            "armazenamento compartilhado (ver A4). Combinar com deduplicação por fingerprint da "
            "mensagem, como <b>_cspReportRecorder.ts</b> já faz."
        ),
        "aceite": [
            "`api/report-error.ts` aplica limitação por IP antes de gravar no Firestore",
            "Rajada acima do teto responde 429 com header `Retry-After`",
            "Relatos repetidos idênticos são agregados por contador, não duplicados como documentos novos",
            "Teste automatizado cobrindo o retorno 429",
        ],
    },
    {
        "id": "A3",
        "severidade": "media",
        "categoria": "3. Confiança em entrada externa (SSRF)",
        "titulo": "Allowlist de host validada só na URL inicial; redirects seguidos sem revalidar",
        "arquivo": "server.ts:752-762 · server/_modelMetadata.ts:260-285",
        "arquivo_resumo": "server.ts:752-762<br/>_modelMetadata.ts:260-285",
        "codigo": """// server.ts — /api/proxy-image (sem autenticação)
if (!isAllowedImageHost(parsed.hostname)) {          // 752 — valida a URL inicial
  res.status(403).json({ error: "host não permitido" });
  return;
}
const upstream = await fetch(rawUrl, {
  headers: { "User-Agent": "..." },
  redirect: "follow",                                 // 761 — destino final não é revalidado
});

// server/_modelMetadata.ts — readModelMetadata (sem autenticação)
if (!isAllowedImportHost(targetUrl.hostname)) { /* 260 */ }
const response = await fetch(targetUrl, { headers: {...}, redirect: "follow" });  // 284""",
        "descricao": (
            "Os dois pontos checam o host <b>antes</b> do fetch e depois seguem redirects "
            "automaticamente. O destino final nunca volta à allowlist. A lista padrão "
            "(<b>server.ts:48-54</b>) inclui sites de conteúdo gerado por usuário — thingiverse.com, "
            "printables.com, cults3d.com, myminifactory.com — e o casamento aceita subdomínios "
            "(<b>host.endsWith(\".\" + allowed)</b>)."
        ),
        "explorabilidade": (
            "Condicionada a um <b>open redirect em qualquer host da allowlist</b> — classe comum em "
            "sites com perfis e links de usuário. Com um, o atacante alcança endereços internos "
            "(<b>169.254.169.254</b>, <b>10.0.0.0/8</b>, <b>localhost</b>). Em <b>/api/proxy-image</b> o corpo "
            "da resposta volta ao chamador quando o <b>Content-Type</b> começa com <b>image/</b>, "
            "cabeçalho que o servidor de destino controla. Ambas as rotas são <b>anônimas</b>."
        ),
        "impacto": (
            "Leitura de serviços internos e de endpoints de metadados da nuvem a partir do IP do "
            "servidor, com exfiltração do conteúdo pela resposta do proxy. Em "
            "<b>/api/model-metadata</b>, também uso do servidor como proxy de leitura anônimo."
        ),
        "correcao": (
            "Usar <b>redirect: \"manual\"</b> e reaplicar <b>isAllowedImageHost</b>/"
            "<b>isAllowedImportHost</b> a cada salto, com teto de saltos. Antes de conectar, resolver "
            "o hostname e rejeitar IPs privados, loopback e link-local. Restringir a allowlist aos "
            "domínios efetivamente necessários e exigir autenticação onde o recurso não é público."
        ),
        "aceite": [
            "Requisição a host permitido que redireciona para IP privado é rejeitada com 403",
            "Redirect para host fora da allowlist é rejeitado, não seguido",
            "Número máximo de saltos aplicado e testado",
            "Resolução DNS bloqueia faixas privadas, loopback e link-local antes da conexão",
            "Testes cobrindo redirect para host proibido e para IP interno",
        ],
    },
    {
        "id": "A4",
        "severidade": "baixa",
        "categoria": "4. Superfície de abuso / configuração de deploy",
        "titulo": "Rate limiter guardado em memória do processo é inefetivo em runtime serverless",
        "arquivo": "server.ts:65-83 · api/csp-report.ts:21 · api/mercadopago/payment-status.ts:8 · api/mercadopago/process-payment.ts:11",
        "arquivo_resumo": "server.ts:65-83<br/>csp-report.ts:21<br/>payment-status.ts:8<br/>process-payment.ts:11",
        "codigo": """// server.ts:65 — e o mesmo padrão repetido nas funções serverless
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute: number) {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip}`;
    // ... contador vive apenas nesta instância do processo""",
        "descricao": (
            "Os contadores ficam num <b>Map</b> local. Em Express de instância única isso funciona; na "
            "Vercel, cada invocação pode cair numa instância diferente e instâncias frias começam "
            "com o mapa vazio."
        ),
        "explorabilidade": (
            "Não exige truque: o próprio modelo de escala do provedor dilui o limite. O teto efetivo "
            "vira <i>máximo por minuto × número de instâncias ativas</i>, valor que o atacante "
            "aumenta simplesmente paralelizando as requisições."
        ),
        "impacto": (
            "Enfraquece a proteção de <b>/api/mercadopago/process-payment</b> (chamadas ao provedor "
            "de pagamento), <b>/api/csp-report</b> e <b>/api/calculator/extract-slicer</b> (cota da API "
            "Gemini). É o multiplicador que agrava A2."
        ),
        "correcao": (
            "Mover a contagem para armazenamento compartilhado (Vercel KV, Upstash Redis ou um "
            "documento do Firestore com <b>FieldValue.increment</b>) ou adotar o rate limiting da "
            "borda do provedor. Manter o limitador em memória apenas como segunda linha."
        ),
        "aceite": [
            "Contadores persistem fora da memória do processo",
            "Teto respeitado com requisições paralelas atingindo instâncias diferentes",
            "Rotas de pagamento, CSP e extract-slicer cobertas",
            "Teste de carga confirmando 429 no teto configurado",
        ],
    },
    {
        "id": "A5",
        "severidade": "baixa",
        "categoria": "1. Banco sem tranca (integridade de identidade)",
        "titulo": "Nome e foto exibidos em avaliações não são amarrados ao usuário autenticado",
        "arquivo": "firestore.rules:127-136, 237-241",
        "arquivo_resumo": "firestore.rules:<br/>127-136, 237-241",
        "codigo": """function isValidReview(data) {
  return data.productId is string && data.productId.size() <= 128 &&
         data.userId is string &&
         data.rating is number && data.rating >= 1 && data.rating <= 5 &&
         optionalString(data.get('comment', null), 1000) &&
         optionalString(data.get('userName', null), 160) &&   // ← conteúdo livre
         optionalString(data.get('userPhoto', null), 2048) && // ← URL livre
         /* ... */;
}
allow create: if isSignedIn()
              && isValidReview(incoming())
              && incoming().userId == request.auth.uid      // ← userId é amarrado
              && reviewId == incoming().productId + '_' + request.auth.uid
              && !('hidden' in incoming());""",
        "descricao": (
            "A regra amarra corretamente <b>userId</b> e força um ID determinístico (uma avaliação por "
            "usuário por produto), mas <b>userName</b> e <b>userPhoto</b> — os campos efetivamente "
            "exibidos — aceitam qualquer string. O cliente legítimo envia os dados do próprio perfil "
            "(<b>src/hooks/useReviews.ts:91-92</b>), porém isso é convenção do frontend, não regra."
        ),
        "explorabilidade": (
            "Qualquer usuário autenticado escreve o documento direto pelo SDK web com "
            "<b>userName: \"INOVAPRO3D Oficial\"</b> e um <b>userPhoto</b> apontando para qualquer URL. "
            "A avaliação é renderizada publicamente em "
            "<b>src/components/product/ProductReviews.tsx:211,223</b>."
        ),
        "impacto": (
            "Personificação da marca ou de outro cliente em avaliações públicas de produto, com peso "
            "de prova social. A URL da foto também vira um beacon: carrega do navegador de todo "
            "visitante da página do produto, revelando IP e User-Agent a um terceiro escolhido pelo "
            "autor da avaliação."
        ),
        "correcao": (
            "Ou remover <b>userName</b>/<b>userPhoto</b> do documento e resolvê-los na leitura a partir "
            "de <b>users/{userId}</b>, ou exigir na regra que casem com o token "
            "(<b>incoming().userName == request.auth.token.name</b>). Para a foto, restringir o host a "
            "domínios conhecidos de avatar."
        ),
        "aceite": [
            "Avaliação com `userName` divergente da identidade autenticada é rejeitada pela regra",
            "`userPhoto` fora dos hosts permitidos é rejeitada",
            "Avaliações existentes continuam renderizando (migração ou leitura por junção)",
            "Teste de regra cobrindo tentativa de personificação",
        ],
    },
    {
        "id": "A6",
        "severidade": "baixa",
        "categoria": "5. Inputs sem tratamento (XSS)",
        "titulo": "CSP publicada apenas em Report-Only: a política existe mas não bloqueia",
        "arquivo": "vercel.json:40-41 · server.ts:837",
        "codigo": """// vercel.json:40
{ "key": "Content-Security-Policy-Report-Only", "value": "default-src 'self'; script-src 'self' 'sha256-...' ..." }

// server.ts:837
res.setHeader("Content-Security-Policy-Report-Only", cspReportOnly);""",
        "descricao": (
            "A política é bem construída — hashes por script inline, <b>script-src-attr 'none'</b>, "
            "<b>object-src 'none'</b>, <b>base-uri 'self'</b>, <b>frame-ancestors 'none'</b>, sem "
            "<b>unsafe-inline</b> em <b>script-src</b> — e há verificação pós-build "
            "(<b>scripts/verify-csp.ts</b>). Mas, publicada como <b>Report-Only</b>, o navegador apenas "
            "relata: <b>nenhuma injeção é impedida</b>. O código comenta que a escolha é deliberada "
            "para esta etapa (<b>server.ts:813-814</b>)."
        ),
        "explorabilidade": (
            "Não é uma falha explorável por si: é a ausência da camada que conteria um XSS caso um "
            "apareça. Hoje o frontend não tem nenhum vetor de injeção (ver Pontos Fortes), então o "
            "risco atual é de regressão futura, não de exploração imediata."
        ),
        "impacto": (
            "Um <b>dangerouslySetInnerHTML</b> introduzido num commit futuro, ou um script de terceiro "
            "comprometido, executaria sem obstáculo. Perde-se também a proteção contra roubo de "
            "token do Firebase via exfiltração para host externo."
        ),
        "correcao": (
            "Analisar os relatos já coletados em <b>cspReports</b>, confirmar ausência de violações "
            "legítimas e promover o header para <b>Content-Security-Policy</b>, mantendo o "
            "<b>report-uri</b> ativo. A infraestrutura de geração e verificação já está pronta."
        ),
        "aceite": [
            "Relatos de `cspReports` revisados e sem violação legítima pendente",
            "Header publicado como `Content-Security-Policy` em `vercel.json` e em `server.ts`",
            "Fluxos de login, checkout Stripe/Mercado Pago e painel admin validados sob bloqueio",
            "`report-uri` mantido para monitorar regressões",
        ],
    },
    {
        "id": "A7",
        "severidade": "baixa",
        "categoria": "3. Verificação de posse / integridade de pagamento",
        "titulo": "Webhook do Stripe marca pedido como PAGO sem conferir valor nem estado anterior",
        "arquivo": "server.ts:249-263",
        "codigo": """const obj = event.data.object as { metadata?: { orderId?: string }; amount?: number };
const orderId = obj.metadata?.orderId;
if (event.type === "payment_intent.succeeded" && orderId) {
  // ... nenhuma comparação entre obj.amount e order.total
  // ... nenhuma checagem do status atual do pedido
  await getAdminDb().collection("orders").doc(orderId).update({
    status: "PAID",
    paidAt: new Date(),
  });""",
        "descricao": (
            "A assinatura do evento é verificada corretamente (<b>server.ts:244</b>), mas a gravação "
            "confia no <b>orderId</b> do metadata e marca <b>PAID</b> sem comparar o valor recebido com "
            "o total do pedido e sem consultar o estado atual. O fluxo do Mercado Pago faz as duas "
            "coisas — reconsulta o pagamento na API do provedor, compara os centavos e registra "
            "<b>amount_mismatch</b> (<b>server/mercadopago/_webhookService.ts:48,99-111</b>) — a "
            "assimetria entre os dois provedores é o achado."
        ),
        "explorabilidade": (
            "Não é explorável remotamente hoje: exige um evento com assinatura válida do Stripe, e o "
            "PaymentIntent é criado com o total lido do pedido no servidor "
            "(<b>server.ts:196-224</b>). O risco é de integridade — captura parcial, reembolso "
            "parcial ou mudança futura na criação do intent passariam despercebidos. Vale registrar "
            "também que <b>não existe função serverless correspondente em api/</b>: em produção na "
            "Vercel esse webhook não está publicado, então o caminho hoje é o self-host."
        ),
        "impacto": (
            "Pedido marcado como pago por valor inferior ao devido, sem trilha de auditoria da "
            "divergência, e reprocessamento silencioso de eventos repetidos."
        ),
        "correcao": (
            "Espelhar a lógica do Mercado Pago: comparar <b>obj.amount</b> com <b>order.total</b> em "
            "centavos, recusar e registrar a divergência, aplicar transição de estado idempotente "
            "dentro de transação e gravar o evento em <b>paymentEvents</b>. Se o Stripe permanecer "
            "ativo em produção, publicar a função serverless equivalente."
        ),
        "aceite": [
            "Webhook compara valor recebido com `order.total` em centavos e recusa divergência",
            "Divergência registrada em `paymentEvents` com valores esperado e recebido",
            "Evento repetido não reprocessa o pedido (idempotência verificada em transação)",
            "Decisão registrada sobre publicar ou remover o caminho Stripe em produção",
        ],
    },
    {
        "id": "A8",
        "severidade": "informativa",
        "categoria": "4. Configuração de CI/CD",
        "titulo": "Workflow ci.yml não declara permissions do GITHUB_TOKEN",
        "arquivo": ".github/workflows/ci.yml:1-9",
        "codigo": """name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:                      # ← nenhum bloco `permissions:` — herda o padrão do repositório""",
        "descricao": (
            "O workflow <b>quality.yml</b> declara corretamente <b>permissions: contents: read</b> "
            "(<b>.github/workflows/quality.yml:9-10</b>). O <b>ci.yml</b> não declara nada e herda o "
            "padrão do repositório, que em repositórios mais antigos é leitura <i>e escrita</i>."
        ),
        "explorabilidade": (
            "Não há execução de código de terceiros no workflow além das dependências instaladas por "
            "<b>npm ci</b>, e não há segredos expostos ao job. A exposição depende de "
            "comprometimento de uma dependência de build."
        ),
        "impacto": (
            "Um script de instalação malicioso numa dependência teria, no pior caso, um token com "
            "permissão de escrita no repositório."
        ),
        "correcao": (
            "Acrescentar <b>permissions: contents: read</b> no topo do <b>ci.yml</b>, igual ao "
            "<b>quality.yml</b>. Os dois workflows executam checagens praticamente idênticas — vale "
            "avaliar a consolidação num só."
        ),
        "aceite": [
            "`ci.yml` declara `permissions: contents: read`",
            "Padrão do repositório revisado em Settings → Actions → Workflow permissions",
            "Duplicação entre `ci.yml` e `quality.yml` avaliada",
        ],
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# PONTOS FORTES — o que foi verificado e está correto
# ─────────────────────────────────────────────────────────────────────────────

PONTOS_FORTES = [
    {
        "titulo": "Firestore fecha por padrão e abre coleção por coleção",
        "evidencia": "firestore.rules:157-159",
        "texto": (
            "<b>match /{document=**} { allow read, write: if false; }</b> abre o arquivo, e cada uma das "
            "23 coleções recebe regra explícita. Nenhuma coleção usada no código ficou sem regra — "
            "e as coleções escritas só pelo Admin SDK (<b>paymentAttempts</b>, <b>paymentEvents</b>, "
            "<b>cspReports</b>) deliberadamente não têm regra, caindo na negação padrão."
        ),
    },
    {
        "titulo": "Isolamento por dono aplicado nas coleções sensíveis",
        "evidencia": "firestore.rules:290-295, 354-358, 361-365",
        "texto": (
            "<b>orders</b> e <b>quotes</b> permitem leitura apenas ao dono ou ao admin; "
            "<b>savedCalculations</b> separa as operações (<b>read/delete</b>, <b>create</b>, <b>update</b>) "
            "para impedir a criação de documento com <b>userId</b> de terceiro, e o <b>update</b> exige "
            "que o dono não mude. As consultas do cliente filtram de acordo — "
            "<b>src/pages/public/MyOrders.tsx:37</b> usa <b>where(\"userId\", \"==\", user.uid)</b>."
        ),
    },
    {
        "titulo": "Auto-promoção a administrador é impossível",
        "evidencia": "firestore.rules:53-60, 162-167",
        "texto": (
            "<b>isValidProfileSelfUpdate()</b> restringe a atualização do próprio perfil a "
            "<b>hasOnly(['name','firstName','lastName','phone','addresses','photoURL'])</b> — "
            "<b>role</b> está fora. A criação força <b>role == 'CUSTOMER'</b> e <b>email == authEmail()</b>, "
            "e <b>users</b> não tem <b>allow delete</b>, então não dá para apagar e recriar o documento "
            "com outro papel. <b>list</b> também não é concedido: a coleção de usuários não é enumerável."
        ),
    },
    {
        "titulo": "Nenhum IDOR: todos os handlers que recebem ID verificam posse",
        "evidencia": "server.ts:202, 652 · api/mercadopago/payment-status.ts:92 · server/_orderNotification.ts:107 · server/mercadopago/_service.ts:96",
        "texto": (
            "Os 16 handlers foram percorridos individualmente. Os cinco que recebem um "
            "identificador de pedido comparam <b>order.userId</b> com o UID do token verificado antes "
            "de qualquer leitura ou escrita: criação de PaymentIntent, consulta de status (nas duas "
            "implementações), notificação de pedido e processamento de Pix. Os demais não operam "
            "sobre objeto identificado por ID."
        ),
    },
    {
        "titulo": "Preço recalculado no servidor a partir do catálogo",
        "evidencia": "api/orders/create.ts:79-126 · server.ts:392-424",
        "texto": (
            "O cliente envia apenas itens e quantidades; <b>computeOrderTotal</b> recarrega os preços "
            "de <b>products</b> pelo Admin SDK. <b>userName</b> e <b>userEmail</b> do corpo são "
            "ignorados de propósito e substituídos por <b>resolveTrustedIdentity()</b>, que só aceita "
            "e-mail com claim <b>email_verified</b> (<b>server/_orderNotification.ts:35-38</b>). Fecha "
            "manipulação de preço via localStorage e o uso da rota como relay de e-mail."
        ),
    },
    {
        "titulo": "Verificação de token falha fechada",
        "evidencia": "server.ts:107-116 · api/orders/create.ts:39-48",
        "texto": (
            "<b>verifyToken</b> devolve <b>null</b> em qualquer falha, e as rotas recusam quando o "
            "Admin SDK não está configurado (<b>503</b>) em vez de degradar para modo sem "
            "autenticação. O comentário no código registra que a versão anterior devolvia a string "
            "<b>\"unchecked\"</b> — que passava no teste <b>if (!uid)</b> — e que isso foi corrigido."
        ),
    },
    {
        "titulo": "Webhook de pagamento com assinatura HMAC e conferência de valor",
        "evidencia": "server/mercadopago/_webhook.ts:46-75 · server/mercadopago/_webhookService.ts:48,99-111",
        "texto": (
            "A assinatura usa <b>timingSafeEqual</b>, valida o formato do hash, e rejeita timestamp "
            "com mais de 5 minutos (anti-replay). O payload recebido nunca é fonte de verdade: o "
            "pagamento é <b>reconsultado na API do provedor</b>, o valor é comparado com o total do "
            "pedido (<b>amount_mismatch</b>) e a transição de estado acontece dentro de uma transação "
            "com registro em <b>paymentEvents</b>. A criação de Pix também é transacional e "
            "idempotente, evitando cobrança dupla em clique repetido."
        ),
    },
    {
        "titulo": "Frontend sem nenhum vetor de injeção de HTML",
        "evidencia": "varredura de src/ (216 arquivos .ts/.tsx) e index.html",
        "texto": (
            "Zero ocorrências de <b>dangerouslySetInnerHTML</b>, <b>innerHTML</b>, <b>outerHTML</b>, "
            "<b>insertAdjacentHTML</b>, <b>eval</b>, <b>new Function</b> e <b>document.write</b>. Todo "
            "conteúdo gerado por usuário — comentários de avaliação, nomes, notas — é renderizado "
            "como texto JSX, que o React escapa. Não há renderização de Markdown nem de HTML "
            "recebido. Por isso o projeto não precisa de biblioteca de sanitização: não há ponto "
            "onde ela seria aplicada."
        ),
    },
    {
        "titulo": "Escape centralizado nos canais que interpretam markup",
        "evidencia": "server/_escapeHtml.ts · _emailTemplates.ts:40,44,54,78-82 · _orderNotification.ts:157-164 · _reportError.ts:59-64",
        "texto": (
            "E-mail e Telegram renderizam HTML. Todo valor interpolado passa por <b>escapeHtml()</b> — "
            "inclusive os que vêm do Firestore, que um dia foram digitados por alguém. O módulo é "
            "puro e compartilhado pelos dois runtimes, com testes próprios "
            "(<b>server/_escapeHtml.test.ts</b>, <b>_emailTemplates.test.ts</b>)."
        ),
    },
    {
        "titulo": "Nenhum segredo no código, nas configs ou no histórico do git",
        "evidencia": ".gitignore:7-8 · .env.example · varredura de todos os commits",
        "texto": (
            "<b>.env.example</b> traz somente chaves vazias e comentários. A varredura de <b>todos</b> "
            "os commits de <b>todas</b> as refs não encontrou chave privada, token de bot, segredo "
            "de webhook ou credencial de API. Nenhum arquivo <b>.env</b> real foi rastreado. Não há "
            "defaults inseguros do tipo <b>${VAR:-segredo}</b> — os únicos fallbacks literais são a "
            "URL pública do site e o nome do remetente. Os segredos de servidor ficam em "
            "<b>server/mercadopago/_config.ts</b>, deliberadamente fora de <b>src/</b>."
        ),
    },
    {
        "titulo": "Bundle do navegador carrega apenas chaves públicas por natureza",
        "evidencia": "dist/assets/*.js · src/lib/mercadopago/config.ts:1-7",
        "texto": (
            "A inspeção do bundle compilado encontrou a Firebase Web API Key e a Public Key do "
            "Mercado Pago (<b>APP_USR-&lt;uuid&gt;</b>, formato de chave pública, não de access token). "
            "As duas são identificadores públicos por desenho. Nenhum <b>STRIPE_SECRET_KEY</b>, "
            "<b>MERCADOPAGO_ACCESS_TOKEN</b>, <b>FIREBASE_PRIVATE_KEY</b>, <b>SENDPULSE_API_SECRET</b>, "
            "<b>GEMINI_API_KEY</b> ou token do Telegram vazou para o navegador."
        ),
    },
    {
        "titulo": "Regras de segurança cobertas por testes automatizados",
        "evidencia": "tests/rules/firestore.rules.test.ts (275 linhas) · package.json:test:rules",
        "texto": (
            "Suíte executada contra o emulador do Firestore cobrindo negação de leitura de "
            "<b>coupons</b> por cliente, ID determinístico de <b>reviews</b>/<b>reviewVotes</b>/"
            "<b>reviewReports</b>, tentativa de gravar no ID de outro usuário, inscrição de "
            "newsletter e campos opcionais ausentes. Regra de segurança neste projeto é código "
            "testado, não comentário."
        ),
    },
]

PONTOS_FRACOS = [
    (
        "O anexo não herda a tranca do documento",
        "O risco central. O orçamento está protegido no Firestore, mas a imagem que o acompanha "
        "está aberta no Storage — e <b>read</b> ali também concede <b>list</b>, o que torna o acervo "
        "enumerável, não só acessível por URL adivinhada. É o único achado que expõe dado de "
        "cliente sem depender de nenhuma outra condição.",
    ),
    (
        "As defesas do Express não foram todas portadas para a Vercel",
        "O projeto mantém dois runtimes com a mesma superfície de API, e a Vercel é a de produção. "
        "O rate limit de <b>/api/report-error</b> existe só no Express; o webhook do Stripe existe "
        "só no Express. Sempre que os dois divergem, é a produção que fica descoberta — e a "
        "divergência não é visível em revisão de código, porque cada arquivo isolado parece correto.",
    ),
    (
        "Allowlist de host que não sobrevive ao primeiro redirect",
        "Duas rotas anônimas validam o destino e depois deixam o <b>fetch</b> seguir para onde o "
        "servidor remoto mandar. A allowlist inclui sites de conteúdo de usuário, onde open "
        "redirect é achado comum.",
    ),
    (
        "Contadores de abuso presos à memória do processo",
        "Todo limitador do projeto guarda estado num <b>Map</b> local. Sob escala horizontal, o teto "
        "configurado deixa de ser o teto real — o que transforma cada endpoint anônimo numa "
        "superfície de custo.",
    ),
    (
        "A camada que conteria um XSS está desligada",
        "O frontend hoje não tem vetor de injeção, e a CSP está bem escrita — mas publicada em "
        "Report-Only. É proteção construída e não acionada: o dia em que uma regressão introduzir "
        "um <b>dangerouslySetInnerHTML</b>, nada a impedirá.",
    ),
]

RECOMENDACOES = [
    (
        "P1",
        "Fechar a leitura pública dos anexos de orçamento",
        "storage.rules:33-36 — trocar <b>allow read: if true</b> por <b>isAdmin()</b> (ou restrição pelo "
        "UID do caminho). É a única correção que interrompe um vazamento de dado de cliente "
        "ativo hoje, e é uma linha.",
        "A1",
    ),
    (
        "P1",
        "Aplicar rate limit no endpoint anônimo de produção",
        "api/report-error.ts — portar o limitador que já existe no Express e em "
        "<b>api/csp-report.ts</b>, somado a deduplicação por fingerprint. Sem isso, qualquer pessoa "
        "escreve no Firestore em laço.",
        "A2",
    ),
    (
        "P2",
        "Revalidar host a cada redirect e bloquear faixas internas",
        "server.ts:761 e server/_modelMetadata.ts:284 — <b>redirect: \"manual\"</b> com reaplicação da "
        "allowlist por salto, teto de saltos e recusa de IPs privados, loopback e link-local após "
        "resolução DNS.",
        "A3",
    ),
    (
        "P2",
        "Mover os contadores de rate limit para armazenamento compartilhado",
        "Vercel KV, Upstash Redis ou documento do Firestore com <b>FieldValue.increment</b>. Destrava "
        "a eficácia real de todos os limitadores, inclusive o de P1.",
        "A4",
    ),
    (
        "P2",
        "Amarrar nome e foto da avaliação à identidade autenticada",
        "firestore.rules:127-136 — exigir que <b>userName</b> case com o token, ou resolver os campos "
        "de exibição na leitura a partir de <b>users/{userId}</b>; restringir o host de <b>userPhoto</b>.",
        "A5",
    ),
    (
        "P3",
        "Promover a CSP de Report-Only para bloqueio",
        "Analisar o que foi coletado em <b>cspReports</b>, validar os fluxos de login, checkout e "
        "admin sob bloqueio e publicar como <b>Content-Security-Policy</b>. Toda a infraestrutura de "
        "geração e verificação já existe.",
        "A6",
    ),
    (
        "P3",
        "Equiparar o webhook do Stripe ao rigor do Mercado Pago",
        "Conferência de valor em centavos, idempotência transacional e registro em "
        "<b>paymentEvents</b> — ou decisão explícita de descontinuar o caminho Stripe, já que ele "
        "não está publicado na Vercel.",
        "A7",
    ),
    (
        "P3",
        "Declarar permissions no ci.yml",
        "Acrescentar <b>permissions: contents: read</b>, como já faz o <b>quality.yml</b>, e avaliar a "
        "consolidação dos dois workflows.",
        "A8",
    ),
]

# Agrupamento das issues do GitHub: achados triviais e relacionados viram uma
# issue só, para não gerar spam no board.
ISSUES = [
    {"titulo": "Anexos de orçamento no Storage são legíveis e enumeráveis por qualquer visitante",
     "labels": "security, severity:high, storage-rules", "achados": ["A1"]},
    {"titulo": "Endpoint anônimo /api/report-error grava no Firestore sem rate limit em produção",
     "labels": "security, severity:medium, backend", "achados": ["A2"]},
    {"titulo": "SSRF: allowlist de host não é revalidada após redirect em proxy-image e model-metadata",
     "labels": "security, severity:medium, backend", "achados": ["A3"]},
    {"titulo": "Rate limiters em memória são inefetivos no runtime serverless",
     "labels": "security, severity:low, infra", "achados": ["A4"]},
    {"titulo": "Avaliações permitem personificação: userName e userPhoto não são amarrados ao usuário",
     "labels": "security, severity:low, firestore-rules", "achados": ["A5"]},
    {"titulo": "Promover CSP de Report-Only para bloqueio e alinhar permissions do CI",
     "labels": "security, severity:low, hardening", "achados": ["A6", "A8"]},
    {"titulo": "Webhook do Stripe marca pedido como pago sem conferir valor nem idempotência",
     "labels": "security, severity:low, payments", "achados": ["A7"]},
]
