import { chromium } from "playwright";
import fs from "node:fs";

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
const categoriaNome = `Material Smoke E2 ${sufixo}`;
const unidadeEmail = `smoke.e2.unidade.${sufixo}@uern.br`;
const setorEmail = `smoke.e2.setor.${sufixo}@uern.br`;
const ppEmail = `smoke.e2.pesquisaprecos.${sufixo}@uern.br`;
const setorNome = `Setor Smoke E2 ${sufixo}`;
const ppNome = `Fulana Pesquisa E2 ${sufixo}`;
const amostraPdfPath = `/tmp/smoke-e2-amostra-${sufixo}.pdf`;

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

await passo("criar categoria e item de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke E2");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke E2");
});

await passo("criar setor técnico e atribuir a categoria", async () => {
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

await passo("criar unidade de teste", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke E2");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

await passo("criar acesso próprio de Pesquisa de Preços", async () => {
  await page.goto(`${BASE}/admin/pesquisa-precos`);
  const form = page.locator('form:has(h2:text("Novo acesso"))');
  await form.locator('input[name="nome"]').fill(ppNome);
  await form.locator('input[name="matricula"]').fill("PP-E2-001");
  await form.locator('input[name="funcao"]').fill("Servidora de Pesquisa de Preços");
  await form.locator('input[name="email"]').fill(ppEmail);
  await form.locator('input[name="senhaInicial"]').fill("senha12345");
  await form.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${ppNome}`);
});

let dfdPdfUrl = "";

await passo("login Unidade, criar DFD com item e enviar para aprovação", async () => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();

  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  dfdPdfUrl = `${page.url()}/pdf`;

  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase E2 (Pesquisa de Preços)");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase E2, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "3");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Fase E2.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("baixar o PDF do DFD para usar como amostra de upload na Pesquisa de Preços", async () => {
  const resposta = await page.request.get(dfdPdfUrl);
  if (resposta.status() !== 200) throw new Error(`status inesperado ao baixar PDF de amostra: ${resposta.status()}`);
  const buffer = await resposta.body();
  fs.writeFileSync(amostraPdfPath, buffer);
});

await passo("login PROAD e aprovar DFD", async () => {
  await loginProad();
  await page.waitForSelector("text=Demanda de teste da Fase E2 (Pesquisa de Preços)");
  const linhaDfd = page.locator("tr", { hasText: "Demanda de teste da Fase E2 (Pesquisa de Preços)" });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
});

await passo("login Setor Técnico e consolidar categoria", async () => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();

  await page.click(`tr:has-text("${categoriaNome}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);

  const checkboxes = page.locator(
    'input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]',
  );
  const total = await checkboxes.count();
  if (total === 0) throw new Error("nenhum item pendente encontrado para consolidar");
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', `00000.000000/${ANO}-00`);
  await page.fill('input[name="idDocumentoETP"]', "1234567");
  await page.fill('input[name="dataETP"]', "2030-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
});

async function loginPesquisaPrecos() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', ppEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();
}

await passo("login Pesquisa de Preços e ver a consolidação na listagem como Não iniciada", async () => {
  await loginPesquisaPrecos();
  await page.waitForSelector("text=Pesquisa de Preços");
  await page.waitForSelector(`text=${categoriaNome}`);
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Não iniciada").waitFor();
});

let pesquisaUrl = "";

await passo("abrir a consolidação e enviar o PDF de amostra para iniciar a pesquisa", async () => {
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/pesquisa-precos\/.+/);
  pesquisaUrl = page.url();

  await page.setInputFiles('input[name="arquivo"]', amostraPdfPath);
  await page.fill('textarea[name="metodologia"]', "Pesquisa inicial — a preencher.");
  await page.click('button:has-text("Enviar e Iniciar Pesquisa de Preços")');
  await page.waitForSelector("text=Itens Pesquisados (1)");
});

await passo("texto extraído do PDF fica disponível como referência", async () => {
  await page.click("text=Ver texto extraído do PDF (referência)");
  const textoExtraido = await page.locator("textarea[readonly]").inputValue();
  if (!textoExtraido.includes("DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA")) {
    throw new Error("texto extraído do PDF não contém o conteúdo esperado do DFD de amostra");
  }
});

await passo("salvar rascunho sem valor pesquisado ainda é permitido", async () => {
  await page.click('button:has-text("Salvar Rascunho")');
  await page.waitForSelector("text=Rascunho salvo.");
});

await passo("finalizar sem valor pesquisado é bloqueado", async () => {
  await page.click('button:has-text("Finalizar Pesquisa de Preços")');
  await page.waitForSelector("text=Informe o valor unitário pesquisado do item nº 1");
});

await passo("preencher valor pesquisado, fontes, metodologia e responsável", async () => {
  await page.fill('input[type="number"]', "950.50");
  await page.fill(
    'textarea[placeholder*="Painel de Preços"]',
    "Painel de Preços (id 456) e cotação com fornecedor Smoke E2.",
  );
  await page.fill(
    'textarea[placeholder*="Fontes consultadas, critério"]',
    "Metodologia completa da pesquisa de preços do smoke test E2.",
  );

  const secaoResponsavel = page.locator('div:has(> h2:text("Responsabilidade pela Elaboração"))');
  await secaoResponsavel.locator("input").nth(0).fill("Fulano de Tal");
  await secaoResponsavel.locator("input").nth(1).fill("12345-6");

  await page.click('button:has-text("Salvar Rascunho")');
  await page.waitForSelector("text=Rascunho salvo.");
});

await passo("PDF da pesquisa em rascunho baixa com sucesso", async () => {
  const resposta = await page.request.get(`${pesquisaUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
  if (resposta.headers()["content-type"] !== "application/pdf") {
    throw new Error(`content-type inesperado: ${resposta.headers()["content-type"]}`);
  }
});

await passo("finalizar a Pesquisa de Preços", async () => {
  await page.click('button:has-text("Finalizar Pesquisa de Preços")');
  await page.waitForSelector("text=Pesquisa de Preços finalizada com sucesso.");
  await page.waitForSelector("text=Finalizado");
});

await passo("campos ficam bloqueados para edição após finalizar", async () => {
  await page.reload();
  const campoValor = await page.locator('input[type="number"]').first().isDisabled();
  if (!campoValor) throw new Error("campo de valor deveria estar desabilitado após finalização");
  const botaoFinalizar = await page.locator('button:has-text("Finalizar Pesquisa de Preços")').count();
  if (botaoFinalizar !== 0) throw new Error("botão Finalizar não deveria mais aparecer");
});

await passo("PDF da pesquisa finalizada baixa com sucesso", async () => {
  const resposta = await page.request.get(`${pesquisaUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
});

await passo("listagem mostra a Pesquisa de Preços como Finalizado", async () => {
  await page.goto(`${BASE}/`);
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Finalizado").waitFor();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
