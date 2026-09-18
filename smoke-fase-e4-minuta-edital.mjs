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
const categoriaNome = `Material Smoke E4 ${sufixo}`;
const unidadeEmail = `smoke.e4.unidade.${sufixo}@uern.br`;
const setorEmail = `smoke.e4.setor.${sufixo}@uern.br`;
const ppEmail = `smoke.e4.pesquisaprecos.${sufixo}@uern.br`;
const planejamentoEmail = `smoke.e4.planejamento.${sufixo}@uern.br`;
const agenteEmail = `smoke.e4.agente.${sufixo}@uern.br`;
const setorNome = `Setor Smoke E4 ${sufixo}`;
const ppNome = `Fulana Pesquisa E4 ${sufixo}`;
const planejamentoNome = `Beltrano Planejamento E4 ${sufixo}`;
const agenteNome = `Ciclano Agente E4 ${sufixo}`;
const amostraPdfPath = `/tmp/smoke-e4-amostra-${sufixo}.pdf`;

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
  await page.fill('input[name="item"]', "Item Smoke E4");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke E4");
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
  await page.fill('input[name="nome"]', "Unidade Smoke E4");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

await passo("criar acessos próprios de Pesquisa de Preços, Planejamento e Agente de Contratação", async () => {
  await page.goto(`${BASE}/admin/pesquisa-precos`);
  const formPP = page.locator('form:has(h2:text("Novo acesso"))');
  await formPP.locator('input[name="nome"]').fill(ppNome);
  await formPP.locator('input[name="matricula"]').fill("PP-E4-001");
  await formPP.locator('input[name="funcao"]').fill("Servidora de Pesquisa de Preços");
  await formPP.locator('input[name="email"]').fill(ppEmail);
  await formPP.locator('input[name="senhaInicial"]').fill("senha12345");
  await formPP.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${ppNome}`);

  await page.goto(`${BASE}/admin/planejamento`);
  const formPl = page.locator('form:has(h2:text("Novo acesso"))');
  await formPl.locator('input[name="nome"]').fill(planejamentoNome);
  await formPl.locator('input[name="matricula"]').fill("PL-E4-001");
  await formPl.locator('input[name="funcao"]').fill("Servidor de Planejamento");
  await formPl.locator('input[name="email"]').fill(planejamentoEmail);
  await formPl.locator('input[name="senhaInicial"]').fill("senha12345");
  await formPl.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${planejamentoNome}`);

  await page.goto(`${BASE}/admin/agentes-contratacao`);
  const formAc = page.locator('form:has(h2:text("Novo acesso"))');
  await formAc.locator('input[name="nome"]').fill(agenteNome);
  await formAc.locator('input[name="matricula"]').fill("AC-E4-001");
  await formAc.locator('input[name="funcao"]').fill("Agente de Contratação");
  await formAc.locator('input[name="email"]').fill(agenteEmail);
  await formAc.locator('input[name="senhaInicial"]').fill("senha12345");
  await formAc.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${agenteNome}`);
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

  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase E4 (Minuta de Edital)");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase E4, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "3");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Fase E4.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("baixar o PDF do DFD para usar como amostra de upload na Pesquisa de Preços", async () => {
  const resposta = await page.request.get(dfdPdfUrl);
  if (resposta.status() !== 200) throw new Error(`status inesperado ao baixar PDF de amostra: ${resposta.status()}`);
  fs.writeFileSync(amostraPdfPath, await resposta.body());
});

await passo("login PROAD e aprovar DFD", async () => {
  await loginProad();
  await page.waitForSelector("text=Demanda de teste da Fase E4 (Minuta de Edital)");
  const linhaDfd = page.locator("tr", { hasText: "Demanda de teste da Fase E4 (Minuta de Edital)" });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
});

let consolidacaoUrl = "";

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

await passo("elaborar e finalizar o ETP", async () => {
  await page.goto(consolidacaoUrl);
  await page.waitForSelector("text=ETP — elaborar");
  await page.click("text=ETP — elaborar");
  await page.waitForURL(/\/consolidacao\/.+\/etp\/.+/);

  await page.click('button:has-text("Iniciar Estudo Técnico Preliminar")');
  await page.waitForSelector('textarea[name="necessidadeContratacao"]');

  for (const campo of CAMPOS_TEXTUAIS_ETP) {
    await page.fill(`[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E4 ${sufixo}.`);
  }
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=ETP finalizado com sucesso.");
});

await passo("login Pesquisa de Preços, iniciar e finalizar a pesquisa", async () => {
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

  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/pesquisa-precos\/.+/);

  await page.setInputFiles('input[name="arquivo"]', amostraPdfPath);
  await page.fill('textarea[name="metodologia"]', "Metodologia da pesquisa de preços do smoke E4.");
  await page.click('button:has-text("Enviar e Iniciar Pesquisa de Preços")');
  await page.waitForSelector("text=Itens Pesquisados (1)");

  await page.fill('input[type="number"]', "950.50");
  await page.fill(
    'textarea[placeholder*="Painel de Preços"]',
    "Painel de Preços (id 789) e cotação com fornecedor Smoke E4.",
  );
  const secaoResponsavel = page.locator('div:has(> h2:text("Responsabilidade pela Elaboração"))');
  await secaoResponsavel.locator("input").nth(0).fill("Fulano de Tal");
  await secaoResponsavel.locator("input").nth(1).fill("12345-6");
  await page.click('button:has-text("Finalizar Pesquisa de Preços")');
  await page.waitForSelector("text=Pesquisa de Preços finalizada com sucesso.");
});

const CAMPOS_TR = [
  "requisitosContratacao",
  "modeloExecucaoObjeto",
  "modeloGestaoContrato",
  "criteriosMedicaoPagamento",
  "formaSelecaoFornecedor",
  "exigenciasHabilitacao",
  "adequacaoOrcamentaria",
  "garantiaExecucao",
];

await passo("login Planejamento, iniciar e finalizar o Termo de Referência", async () => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', planejamentoEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();

  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Pronto para iniciar").waitFor();
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/planejamento\/.+/);

  await page.click('button:has-text("Iniciar Termo de Referência")');
  await page.waitForSelector('textarea[name="requisitosContratacao"]');

  for (const campo of CAMPOS_TR) {
    await page.fill(`textarea[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E4 ${sufixo}.`);
  }
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=Termo de Referência finalizado com sucesso.");
});

async function loginAgenteContratacao() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', agenteEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();
}

await passo("login Agente de Contratação e ver a consolidação como Pronta para iniciar", async () => {
  await loginAgenteContratacao();
  await page.waitForSelector("text=Agente de Contratação");
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Pronta para iniciar").waitFor();
});

let minutaUrl = "";

await passo("abrir a consolidação e iniciar a Minuta de Edital", async () => {
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/agente-contratacao\/.+/);
  minutaUrl = page.url();

  await page.click('button:has-text("Iniciar Minuta de Edital")');
  await page.waitForSelector('textarea[name="condicoesParticipacao"]');
});

await passo("conteúdo puxado do ETP e do Termo de Referência aparece no formulário", async () => {
  await page.waitForSelector("text=Conteúdo puxado do ETP e do Termo de Referência");
  const corpo = await page.locator("body").innerText();
  if (!corpo.includes("smoke E4")) {
    throw new Error("conteúdo do ETP/TR não apareceu puxado no formulário da minuta");
  }
});

const CAMPOS_MINUTA = [
  "condicoesParticipacao",
  "credenciamento",
  "apresentacaoProposta",
  "julgamentoPropostas",
  "documentosHabilitacao",
  "recursosAdministrativos",
  "sancoesAdministrativas",
  "disposicoesGerais",
];

await passo("preencher as seções da minuta e salvar rascunho", async () => {
  for (const campo of CAMPOS_MINUTA) {
    await page.fill(`textarea[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E4 ${sufixo}.`);
  }
  await page.click('button[name="acao"][value="rascunho"]');
  await page.waitForSelector("text=Rascunho salvo.");
});

await passo("PDF da minuta em rascunho baixa com sucesso", async () => {
  const resposta = await page.request.get(`${minutaUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
  if (resposta.headers()["content-type"] !== "application/pdf") {
    throw new Error(`content-type inesperado: ${resposta.headers()["content-type"]}`);
  }
});

await passo("finalizar sem responsável preenchido é bloqueado", async () => {
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=Informe o nome e a matrícula do responsável");
});

await passo("preencher responsável e finalizar a minuta", async () => {
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=Minuta de Edital finalizada com sucesso.");
});

await passo("campos ficam bloqueados para edição após finalizar", async () => {
  await page.reload();
  const campoDesabilitado = await page.locator('textarea[name="condicoesParticipacao"]').isDisabled();
  if (!campoDesabilitado) throw new Error("campo deveria estar desabilitado após finalização");
  const botaoFinalizar = await page.locator('button[name="acao"][value="finalizar"]').count();
  if (botaoFinalizar !== 0) throw new Error("botão Finalizar não deveria mais aparecer");
});

await passo("PDF da minuta finalizada baixa com sucesso", async () => {
  const resposta = await page.request.get(`${minutaUrl}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
});

await passo("listagem do Agente de Contratação mostra a minuta como Finalizado", async () => {
  await page.goto(`${BASE}/`);
  const linha = page.locator("tr", { hasText: categoriaNome });
  // A célula do TR também mostra "Finalizado" na mesma linha — a da minuta é a última.
  await linha.locator("text=Finalizado").last().waitFor();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
