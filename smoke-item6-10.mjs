import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));

async function passo(nome, fn) {
  try {
    await fn();
    console.log(`OK   ${nome}`);
  } catch (e) {
    console.log(`FAIL ${nome}: ${e.message}`);
    process.exitCode = 1;
  }
}

const BASE = "http://localhost:3001";
// Sufixo único por execução: este banco de dev nunca é resetado (acumula
// fixtures de todos os smoke tests já rodados na sessão), então nomes/emails
// fixos colidiriam numa re-execução. Com o sufixo, o teste é idempotente.
const SUF = Date.now();
const EMAIL_X = `cotax-${SUF}@uern.br`;
const EMAIL_Y = `cotay-${SUF}@uern.br`;
const CATEGORIA_EXTRAS = `Categoria Item8 Teste ${SUF}`;
const CATEGORIA_SOLICITACAO = `Material Solicitacao Teste ${SUF}`;
const ITEM_SOLICITADO = `Cadeira ergonômica giratória ${SUF}`;

async function loginProad() {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

async function logout() {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
}

async function loginUnidadePrimeiraVez(email) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);
}

/* ---------- setup: PCA de teste ---------- */

// Cotas do PCA de teste ficam bem acima de qualquer alocação acumulada por
// outros smoke tests já rodados neste banco (eles nunca são resetados, só
// somados) — os valores "que excedem" abaixo usam números redondos bem
// maiores que o total, então o teste não depende de saber a alocação exata
// já existente.
await passo("PROAD: cria e ativa PCA 2029 (cotas grandes, robustas a fixtures de outros smoke tests)", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', "2029");
  await page.fill('input[name="cotaGeral"]', "5000000");
  await page.fill('input[name="cotaOP"]', "1000000");
  await page.fill('input[name="dataAbertura"]', "2029-01-01");
  await page.fill('input[name="dataFechamento"]', "2029-01-31");
  await page.click('button:has-text("Salvar")');
  // Escopado ao card do PCA 2029: há um botão "Ativar este PCA" em CADA PCA
  // histórico não-ativo deste banco (nunca resetado), então um clique global
  // no primeiro botão do texto pode ativar o PCA errado.
  const cardPca2029 = page.locator("div.rounded-lg.border", { hasText: "PCA 2029" }).first();
  await cardPca2029.locator('button:has-text("Ativar este PCA")').click();
  await page.waitForSelector("text=PCA 2029 (ativo)");
  await cardPca2029.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').check();
  await page.waitForTimeout(400);
});

/* ---------- item 6+7: alocação de cota / auto-derivação de cotaTipo ---------- */

await passo("item 6: cotaOP acima do subsaldo OP do PCA é rejeitada na criação", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Cota X");
  await page.fill('input[name="email"]', EMAIL_X);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "1500000");
  await page.fill('input[name="cotaGeral"]', "8000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=excede o subsaldo OP disponível no PCA");
});

await passo("item 7: unidade elegível a OP não mostra select manual de tipo de cota", async () => {
  const semSelectManual = await page.locator('select[name="cotaTipo"]').count();
  if (semSelectManual > 0) throw new Error("select de cotaTipo não deveria aparecer para unidade elegível a OP");
});

await passo("item 6: cotaOP dentro do subsaldo é aceita (Unidade Cota X)", async () => {
  await page.fill('input[name="cotaOP"]', "6000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${EMAIL_X}`);
});

await passo("item 6: cotaGeral fechada de Unidade Cota Y dentro do subsaldo geral restante é aceita", async () => {
  await page.fill('input[name="nome"]', "Unidade Cota Y");
  await page.fill('input[name="email"]', EMAIL_Y);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  // não elegível a OP: mantém o select manual de cotaTipo (FECHADA por padrão).
  await page.fill('input[name="cotaGeral"]', "50000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${EMAIL_Y}`);
});

await passo("item 6: editar Unidade Cota Y aumentando cotaGeral além do subsaldo restante falha", async () => {
  const linha = page.locator("tr", { hasText: EMAIL_Y });
  await linha.locator('button:has-text("Editar")').click();
  const painel = linha.locator('form:has(input[name="cotaGeral"])');
  await painel.locator('input[name="cotaGeral"]').fill("6000000");
  await painel.locator('button:has-text("Salvar")').click();
  await page.waitForSelector("text=excede o saldo geral disponível no PCA");
});

await passo("item 6: mesma edição com valor dentro do subsaldo restante é aceita", async () => {
  const linha = page.locator("tr", { hasText: EMAIL_Y });
  const painel = linha.locator('form:has(input[name="cotaGeral"])');
  await painel.locator('input[name="cotaGeral"]').fill("200000");
  await painel.locator('button:has-text("Salvar")').click();
  await page.waitForSelector("text=R$ 200.000,00");
});

await passo("item 6: reduzir a cota (nunca bloqueado, mesmo com o PCA apertado) funciona", async () => {
  const linha = page.locator("tr", { hasText: EMAIL_Y });
  await linha.locator('button:has-text("Editar")').click();
  const painel = linha.locator('form:has(input[name="cotaGeral"])');
  await painel.locator('input[name="cotaGeral"]').fill("50000");
  await painel.locator('button:has-text("Salvar")').click();
  await page.waitForSelector("text=R$ 50.000,00");
});

/* ---------- item 8: campos condicionais no formulário de categoria ---------- */

await passo("item 8: campos extras ficam ocultos por padrão (material com catálogo)", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  const extrasVisiveis = await page.locator('input[name="fluxoContinuo"]').count();
  if (extrasVisiveis > 0) throw new Error("campos extras não deveriam aparecer para material com catálogo");
});

await passo("item 8: marcar 'sem catálogo' revela os campos extras", async () => {
  await page.check('input[name="semItem"]');
  await page.waitForSelector('input[name="fluxoContinuo"]');
});

await passo("item 8: criar categoria de material sem catálogo com fluxo contínuo marcado", async () => {
  await page.fill('input[name="nome"]', CATEGORIA_EXTRAS);
  await page.check('input[name="fluxoContinuo"]');
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATEGORIA_EXTRAS}`);
});

await passo("item 8: trocar para Serviço oculta os campos de novo (modoServico padrão = objeto)", async () => {
  await page.selectOption('select[name="tipo"]', "SERVICO");
  const extrasVisiveis = await page.locator('input[name="fluxoContinuo"]').count();
  if (extrasVisiveis > 0) throw new Error("campos extras não deveriam aparecer para serviço em modo objeto");
});

await passo("item 8: modoServico = itens revela os campos extras para serviço", async () => {
  await page.selectOption('select[name="modoServico"]', "ITENS");
  await page.waitForSelector('input[name="fluxoContinuo"]');
});

/* ---------- item 9: solicitação de novo item de catálogo ---------- */

await passo("item 9: PROAD cadastra categoria de material COM catálogo para o teste do wizard", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('input[name="nome"]', CATEGORIA_SOLICITACAO);
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATEGORIA_SOLICITACAO}`);
  await logout();
});

await passo("item 9: Unidade Cota X envia solicitação de novo item pelo wizard de DFD", async () => {
  await loginUnidadePrimeiraVez(EMAIL_X);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);

  await page.click('button:has-text("Solicitar inclusão de novo item")');
  await page.fill('input[name="nomeResumido"]', ITEM_SOLICITADO);
  await page.fill('textarea[name="descricao"]', "Cadeira com apoio lombar e regulagem de altura.");
  await page.fill('textarea[name="aplicacao"]', "Uso diário no atendimento ao público.");
  await page.fill('input[name="valorEstimado"]', "1200");
  await page.click('button:has-text("Enviar Solicitação")');
  await page.waitForSelector("text=Solicitação enviada ao administrador para análise.");
  await logout();
});

await passo("item 9: PROAD vê a solicitação pendente e aceita, incluindo no catálogo", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/solicitacoes`);
  await page.waitForSelector("text=Pendentes de Análise (1)");
  await page.waitForSelector(`text=${ITEM_SOLICITADO}`);
  await page.click('button:has-text("Analisar")');
  await page.fill('input[name="categoria"]', CATEGORIA_SOLICITACAO);
  await page.fill('input[name="item"]', ITEM_SOLICITADO);
  await page.fill('input[name="valor"]', "1150");
  await page.click('button:has-text("Aceitar e Incluir no Catálogo")');
  await page.waitForSelector("text=Pendentes de Análise (0)");
  await page.waitForSelector("text=Aceita");
});

await passo("item 9: item aceito aparece no catálogo padronizado", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  await page.waitForSelector(`text=${ITEM_SOLICITADO}`);
});

await passo("item 9: Unidade Cota X vê a própria solicitação como aceita", async () => {
  await logout();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', EMAIL_X);
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Minhas Solicitações de Novo Item de Catálogo");
  await page.waitForSelector("text=Aceita — no catálogo");
});

/* ---------- item 10: tipificação obrigatória no DFD ---------- */

await passo("item 10: salvar dados gerais sem tipificação é bloqueado pelo required do formulário", async () => {
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  await page.fill('input[name="descricaoSumaria"]', "Teste tipificação obrigatória");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Texto de justificativa com mais de cem caracteres para passar na validação de tamanho mínimo exigida pelo formulário.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', "2029-06-01");
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForTimeout(500);
  const salvo = await page.locator("text=Salvo.").count();
  if (salvo > 0) throw new Error("não deveria salvar sem tipificação selecionada");
});

await passo("item 10: selecionar tipificação permite salvar normalmente", async () => {
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");
  await logout();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
