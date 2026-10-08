import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") erros.push(`console.error: ${msg.text()}`);
});

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
const ANO = 9100 + (Date.now() % 800);
const sufixo = Date.now();
const categoriaNome = `Material Smoke E0 ${sufixo}`;
const unidadeEmail = `smoke.e0.unidade.${sufixo}@uern.br`;
const setorEmail = `smoke.e0.setor.${sufixo}@uern.br`;

async function loginProad() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

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

await passo("criar categoria", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);
});

await passo("criar item de catálogo na categoria", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke E0");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke E0");
});

const setorNome = `Setor Smoke E0 ${sufixo}`;

await passo("criar setor técnico próprio e atribuir a categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', setorNome);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${setorEmail}`);

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator('select:not([name="modo"])').selectOption({ label: setorNome });
  await page.waitForTimeout(500);
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke E0");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

async function loginUnidade(senha) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', senha);
  await page.click('button[type="submit"]');
}

async function loginSetorTecnico(senha) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senha"]', senha);
  await page.click('button[type="submit"]');
}

/** Unidade/Setor Técnico caem em /selecionar-pca quando há mais de um PCA
 * ativo no ambiente (ex.: outros smoke tests deixaram PCAs ativos) — escolhe
 * o PCA deste teste para seguir para a home normalmente. */
async function aguardarHomeOuSelecionarPca() {
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/selecionar-pca");
  if (new URL(page.url()).pathname === "/selecionar-pca") {
    await page.click(`button:has-text("PCA ${ANO}")`);
    await page.waitForURL(`${BASE}/`);
  }
}

await passo("login Unidade, trocar senha, criar DFD com item e enviar para aprovação", async () => {
  await loginUnidade("senha12345");
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();

  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);

  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase E0 (ETP + Riscos)");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase E0, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "3");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Fase E0.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("login PROAD e aprovar DFD", async () => {
  await loginProad();
  await page.waitForSelector("text=Demanda de teste da Fase E0 (ETP + Riscos)");
  const linhaDfd = page.locator("tr", { hasText: "Demanda de teste da Fase E0 (ETP + Riscos)" });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
});

let consolidacaoUrl = "";

await passo("login Setor Técnico, trocar senha e consolidar categoria", async () => {
  await loginSetorTecnico("senha12345");
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();

  await page.click(`tr:has-text("${categoriaNome}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);
  consolidacaoUrl = page.url();

  const checkboxes = page.locator(
    'input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]',
  );
  const total = await checkboxes.count();
  if (total === 0) throw new Error("nenhum item pendente encontrado para consolidar");
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', `00000.000000/${ANO}-00`);
  await page.fill('input[name="dataETP"]', "2030-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
});

let etpUrl = "";
let riscosUrl = "";

await passo("abrir link do ETP a partir do histórico de consolidações", async () => {
  await page.goto(consolidacaoUrl);
  await page.waitForSelector("text=ETP — elaborar");
  await page.click("text=ETP — elaborar");
  await page.waitForURL(/\/consolidacao\/.+\/etp\/.+/);
  etpUrl = page.url();
});

await passo("iniciar o ETP", async () => {
  await page.click('button:has-text("Iniciar Estudo Técnico Preliminar")');
  await page.waitForSelector('textarea[name="necessidadeContratacao"]');
});

await passo("anexo automático de itens aparece no ETP", async () => {
  await page.waitForSelector("text=Item Smoke E0");
  await page.waitForSelector("text=Itens objeto da licitação (1)");
});

const CAMPOS_TEXTUAIS_ETP = [
  "objeto",
  "localEntregaPrestacao",
  "necessidadeContratacao",
  "referenciaPca",
  "requisitosContratacao",
  "estimativaQuantidadesMemoria",
  "levantamentoMercadoJustificativa",
  "estimativaPreliminarPrecos",
  "descricaoSolucaoCompleta",
  "justificativaParcelamento",
  "resultadosEsperados",
  "providenciasAdministracao",
  "contratacoesCorrelatas",
  "impactosAmbientais",
  "declaracaoViabilidade",
];

await passo("preencher todas as seções do ETP e salvar rascunho", async () => {
  for (const campo of CAMPOS_TEXTUAIS_ETP) {
    await page.fill(`[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E0 ${sufixo}.`);
  }
  await page.click('button[name="acao"][value="rascunho"]');
  await page.waitForSelector("text=Rascunho salvo.");
});

await passo("ETP ainda não finalizado permite baixar PDF em rascunho", async () => {
  const resposta = await page.request.get(`${etpUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
  if (resposta.headers()["content-type"] !== "application/pdf") {
    throw new Error(`content-type inesperado: ${resposta.headers()["content-type"]}`);
  }
});

await passo("finalizar ETP sem responsável preenchido é bloqueado", async () => {
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=Informe o nome e a matrícula do responsável");
});

await passo("preencher responsável e finalizar ETP", async () => {
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=ETP finalizado com sucesso.");
  await page.waitForSelector("text=Finalizado");
});

await passo("campos do ETP ficam bloqueados para edição após finalizar", async () => {
  await page.reload();
  const campoDesabilitado = await page.locator('textarea[name="necessidadeContratacao"]').isDisabled();
  if (!campoDesabilitado) throw new Error("campo deveria estar desabilitado após finalização");
  const botaoFinalizar = await page.locator('button[name="acao"][value="finalizar"]').count();
  if (botaoFinalizar !== 0) throw new Error("botão Finalizar não deveria mais aparecer");
});

await passo("PDF do ETP finalizado baixa com sucesso", async () => {
  const resposta = await page.request.get(`${etpUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
});

await passo("abrir link da Análise de Riscos a partir do histórico de consolidações", async () => {
  await page.goto(consolidacaoUrl);
  await page.waitForSelector("text=Riscos — elaborar");
  await page.click("text=Riscos — elaborar");
  await page.waitForURL(/\/consolidacao\/.+\/riscos\/.+/);
  riscosUrl = page.url();
});

await passo("iniciar a Análise de Riscos pré-carregada com os 16 riscos-padrão", async () => {
  await page.click('button:has-text("Iniciar Análise de Riscos")');
  await page.waitForSelector("text=Riscos identificados (16)");
});

await passo("editar um risco, remover outro e adicionar um novo", async () => {
  const cartoes = page.locator("div.rounded-md.border-slate-200.p-3");
  await cartoes.nth(0).locator("textarea").nth(0).fill("Descrição de risco editada pelo smoke test E0.");

  await cartoes.nth(1).locator('button:has-text("Remover")').click();
  await page.waitForSelector("text=Riscos identificados (15)");

  await page.click('button:has-text("+ Adicionar risco")');
  await page.waitForSelector("text=Riscos identificados (16)");
});

await passo("preencher o novo risco adicionado e salvar rascunho", async () => {
  const ultimoCartao = page.locator("div.rounded-md.border-slate-200.p-3").last();
  await ultimoCartao.locator("textarea").nth(0).fill("Descrição do novo risco adicionado pelo smoke test E0.");
  await ultimoCartao.locator("textarea").nth(1).fill("Danos do novo risco adicionado pelo smoke test E0.");
  await ultimoCartao.locator("textarea").nth(2).fill("Ações preventivas do novo risco.");
  await ultimoCartao.locator("textarea").nth(3).fill("Ações contingenciais do novo risco.");
  await ultimoCartao.locator("input").fill("Responsável Smoke E0");

  await page.click('button:has-text("Salvar Rascunho")');
  await page.waitForSelector("text=Rascunho salvo.");
});

await passo("PDF da Análise de Riscos em rascunho baixa com sucesso", async () => {
  const resposta = await page.request.get(`${riscosUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
  if (resposta.headers()["content-type"] !== "application/pdf") {
    throw new Error(`content-type inesperado: ${resposta.headers()["content-type"]}`);
  }
});

await passo("finalizar a Análise de Riscos sem responsável preenchido é bloqueado", async () => {
  await page.click('button:has-text("Finalizar Análise de Riscos")');
  await page.waitForSelector("text=Informe o nome e a matrícula do responsável");
});

await passo("preencher responsável e finalizar a Análise de Riscos", async () => {
  const secaoResponsavel = page.locator('div:has(> h2:text("Responsabilidade pela Elaboração"))');
  await secaoResponsavel.locator("input").nth(0).fill("Fulano de Tal");
  await secaoResponsavel.locator("input").nth(1).fill("12345-6");
  await page.click('button:has-text("Finalizar Análise de Riscos")');
  await page.waitForSelector("text=Análise de Riscos finalizada com sucesso.");
  await page.waitForSelector("text=Finalizado");
});

await passo("campos da Análise de Riscos ficam bloqueados para edição após finalizar", async () => {
  await page.reload();
  const botaoAdicionar = await page.locator('button:has-text("+ Adicionar risco")').count();
  if (botaoAdicionar !== 0) throw new Error("botão Adicionar risco não deveria mais aparecer após finalizar");
  const botaoFinalizar = await page.locator('button:has-text("Finalizar Análise de Riscos")').count();
  if (botaoFinalizar !== 0) throw new Error("botão Finalizar não deveria mais aparecer");
});

await passo("PDF da Análise de Riscos finalizada baixa com sucesso", async () => {
  const resposta = await page.request.get(`${riscosUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
});

await passo("histórico da consolidação mostra ETP e Riscos como Finalizado", async () => {
  await page.goto(consolidacaoUrl);
  await page.waitForSelector("text=ETP (Finalizado)");
  await page.waitForSelector("text=Riscos (Finalizado)");
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
