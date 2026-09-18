import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const erros = [];
// Só "pageerror" (crash de fato) é monitorado — algumas telas administrativas
// pré-existentes (categorias/catálogo/licitações), de fases bem anteriores à
// E6, emitem um console.error de serialização de campos Decimal ao passar
// unidades para um Client Component; é um aviso pré-existente e não afeta o
// funcionamento, então não é tratado como falha aqui.
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
const ANO = 9800 + (Date.now() % 190);
const SUF = Date.now();
const CATEGORIA = `Material Smoke E6 ${SUF}`;
const CATALOGO_ITEM = `Peça Smoke E6 ${SUF}`;
const SETOR_NOME = `Setor Smoke E6 ${SUF}`;
const SETOR_EMAIL = `smoke.e6.setor.${SUF}@uern.br`;
const UNIDADE_EMAIL = `smoke.e6.unidade.${SUF}@uern.br`;
const LICITACOES_EMAIL = `smoke.e6.licitacoes.${SUF}@uern.br`;
const PROCESSO_SEI = `00000.${SUF}/${ANO}-00`;
const DESCRICAO_DFD = `Demanda de teste da Fase E6 ${SUF}`;

async function loginProad() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

async function aguardarHomeOuSelecionarPca() {
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/selecionar-pca");
  if (new URL(page.url()).pathname === "/selecionar-pca") {
    await page.click(`button:has-text("PCA ${ANO}")`);
    await page.waitForURL(`${BASE}/`);
  }
}

async function loginPrimeiraVez(email) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();
}

async function login(email) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();
}

/* ---------- setup ---------- */

await passo("login PROAD", loginProad);

await passo(`criar e ativar PCA ${ANO} (abertura extra geral)`, async () => {
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', String(ANO));
  await page.fill('input[name="cotaGeral"]', "1000000");
  await page.fill('input[name="cotaOP"]', "200000");
  await page.fill('input[name="dataAbertura"]', "2030-01-01");
  await page.fill('input[name="dataFechamento"]', "2030-12-31");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=PCA ${ANO}`);
  const cartaoPcaNovo = page.locator(".rounded-2xl", { hasText: `PCA ${ANO}` });
  await cartaoPcaNovo.locator('button:has-text("Ativar este PCA")').click();
  await page.waitForSelector(`text=PCA ${ANO} (ativo)`);
  const cartaoPca = page.locator(".rounded-2xl", { hasText: `PCA ${ANO} (ativo)` });
  await cartaoPca.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').check();
  await page.waitForTimeout(500);
});

await passo("criar categoria de material e item de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', CATEGORIA);
  await page.selectOption('form:has(h2:text("Nova categoria")) select[name="tipo"]', "MATERIAL");
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATEGORIA}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.fill('input[name="item"]', CATALOGO_ITEM);
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);
});

await passo("criar setor técnico e atribuir a categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', SETOR_NOME);
  await page.fill('input[name="email"]', SETOR_EMAIL);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${SETOR_EMAIL}`);

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: CATEGORIA });
  await linha.locator("select").first().selectOption({ label: SETOR_NOME });
  await page.waitForTimeout(500);
});

await passo("criar unidade de teste", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke E6");
  await page.fill('input[name="email"]', UNIDADE_EMAIL);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_EMAIL}`);
});

await passo("criar acesso de Licitações", async () => {
  await page.goto(`${BASE}/admin/licitacoes`);
  const formLic = page.locator('form:has(h2:text("Novo acesso"))');
  await formLic.locator('input[name="nome"]').fill(`Licitacoes Smoke E6 ${SUF}`);
  await formLic.locator('input[name="email"]').fill(LICITACOES_EMAIL);
  await formLic.locator('input[name="senhaInicial"]').fill("senha12345");
  await formLic.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${LICITACOES_EMAIL}`);
});

/* ---------- Unidade lança DFD, PROAD aprova, Setor Técnico consolida ---------- */

await passo("Unidade lança DFD com item da categoria e envia para aprovação", async () => {
  await loginPrimeiraVez(UNIDADE_EMAIL);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);

  await page.fill('input[name="descricaoSumaria"]', DESCRICAO_DFD);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase E6, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "2");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Fase E6.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("Unidade ainda não vê a seção de fase de licitação (item não consolidado)", async () => {
  const corpo = await page.locator("body").innerText();
  if (corpo.includes("Fase da Licitação dos Meus Itens Consolidados")) {
    throw new Error("a seção não deveria aparecer antes da consolidação pelo Setor Técnico");
  }
});

await passo("PROAD aprova o DFD", async () => {
  await loginProad();
  await page.waitForSelector(`text=${DESCRICAO_DFD}`);
  const linhaDfd = page.locator("tr", { hasText: DESCRICAO_DFD });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
});

await passo("Setor Técnico consolida o item pendente", async () => {
  await loginPrimeiraVez(SETOR_EMAIL);
  await page.click(`tr:has-text("${CATEGORIA}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);

  const checkboxes = page.locator('input[type="checkbox"][name="itemDfdId"]');
  const total = await checkboxes.count();
  if (total === 0) throw new Error("nenhum item pendente encontrado para consolidar");
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', PROCESSO_SEI);
  await page.fill('input[name="dataETP"]', "2030-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
});

/* ---------- Unidade passa a ver a fase (ainda sem status) ---------- */

let licitacaoUrl = "";

await passo("Unidade vê o item consolidado como 'Aguardando início da licitação'", async () => {
  await login(UNIDADE_EMAIL);
  await page.waitForSelector("text=Fase da Licitação dos Meus Itens Consolidados");
  const secao = page.locator("div.rounded-2xl", { hasText: "Fase da Licitação dos Meus Itens Consolidados" });
  await secao.locator(`tr:has-text("${PROCESSO_SEI}")`).waitFor();
  const linha = secao.locator("tr", { hasText: PROCESSO_SEI });
  const textoLinha = await linha.innerText();
  if (!textoLinha.includes("Aguardando início da licitação")) {
    throw new Error(`esperava 'Aguardando início da licitação', veio: ${textoLinha}`);
  }
  if (!textoLinha.includes(CATALOGO_ITEM)) {
    throw new Error("nome do item não aparece na linha");
  }
});

/* ---------- Licitações avança o status manualmente até Homologado ---------- */

async function registrarStatus(status, campos = {}) {
  await page.selectOption('select[name="status"]', status);
  for (const [campo, valor] of Object.entries(campos)) {
    await page.fill(`[name="${campo}"]`, valor);
  }
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
}

await passo("Licitações avança o status do processo", async () => {
  await loginPrimeiraVez(LICITACOES_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI}`);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  licitacaoUrl = page.url();

  await registrarStatus("PESQUISA_PRECOS", { responsavel: "Fulano da Silva" });
  await registrarStatus("TERMO_REFERENCIA", { responsavel: "Fulano da Silva" });
  await registrarStatus("MINUTAS", { responsavel: "Fulano da Silva" });
  await registrarStatus("ANALISE_JURIDICA");
  await registrarStatus("SESSAO_MARCADA", {
    dataSessao: "2030-02-15",
    agenteNome: "Ciclana Souza",
    agenteMatricula: "12345",
  });
  await registrarStatus("ANALISE_PROPOSTAS");
  await registrarStatus("HOMOLOGADO");
  await page.waitForSelector("text=Registrar Resultados da Homologação");
});

await passo("Unidade vê a fase atual acompanhar o status registrado por Licitações", async () => {
  await login(UNIDADE_EMAIL);
  const secao = page.locator("div.rounded-2xl", { hasText: "Fase da Licitação dos Meus Itens Consolidados" });
  const linha = secao.locator("tr", { hasText: PROCESSO_SEI });
  await linha.locator("text=Certame Homologado").waitFor();
});

/* ---------- Licitações registra o resultado e a Unidade vê o resultado final ---------- */

await passo("Licitações registra o resultado de homologação do item", async () => {
  await login(LICITACOES_EMAIL);
  await page.goto(licitacaoUrl);
  await page.waitForSelector("text=Registrar Resultados da Homologação");

  const painel = page.locator("div.rounded-2xl", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_total");
  await painel.locator('input[name="valorUnitario"]').fill("999.90");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=Resultado registrado para o grupo.");
});

await passo("Unidade vê o resultado final da homologação com o valor adjudicado", async () => {
  await login(UNIDADE_EMAIL);
  const secao = page.locator("div.rounded-2xl", { hasText: "Fase da Licitação dos Meus Itens Consolidados" });
  const linha = secao.locator("tr", { hasText: PROCESSO_SEI });
  const textoLinha = await linha.innerText();
  if (!textoLinha.includes("Homologado com sucesso")) {
    throw new Error(`esperava resultado 'Homologado com sucesso', veio: ${textoLinha}`);
  }
  if (!textoLinha.includes("R$")) {
    throw new Error("valor adjudicado não aparece na linha");
  }
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
