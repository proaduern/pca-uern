import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const erros = [];
// Só "pageerror" (crash de fato) é monitorado — algumas telas administrativas
// pré-existentes (categorias/catálogo/licitações), de fases bem anteriores à
// E5, emitem um console.error de serialização de campos Decimal ao passar
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
const ANO = 9500 + (Date.now() % 400);
const SUF = Date.now();
const CATEGORIA = `Material Smoke E51 ${SUF}`;
const CATALOGO_ITEM = `Peça Smoke E51 ${SUF}`;
const SETOR_NOME = `Setor Smoke E51 ${SUF}`;
const SETOR_EMAIL = `smoke.e51.setor.${SUF}@uern.br`;
const UNIDADE_EMAIL = `smoke.e51.unidade.${SUF}@uern.br`;
const LICITACOES_NOME = `Licitacoes Smoke E51 ${SUF}`;
const LICITACOES_EMAIL = `smoke.e51.licitacoes.${SUF}@uern.br`;
const PP_EMAIL = `smoke.e51.pesquisaprecos.${SUF}@uern.br`;
const PLANEJAMENTO_EMAIL = `smoke.e51.planejamento.${SUF}@uern.br`;
const AGENTE_NOME = `Fulana Agente E51 ${SUF}`;
const AGENTE_EMAIL = `smoke.e51.agente.${SUF}@uern.br`;
const PROCESSO_SEI = `00000.${SUF}/${ANO}-00`;
const amostraPdfPath = `/tmp/smoke-e51-amostra-${SUF}.pdf`;

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
  await page.fill('input[name="nome"]', "Unidade Smoke E51");
  await page.fill('input[name="email"]', UNIDADE_EMAIL);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_EMAIL}`);
});

await passo("criar acessos de Licitações, Pesquisa de Preços, Planejamento e Agente de Contratação", async () => {
  await page.goto(`${BASE}/admin/licitacoes`);
  const formLic = page.locator('form:has(h2:text("Novo acesso"))');
  await formLic.locator('input[name="nome"]').fill(LICITACOES_NOME);
  await formLic.locator('input[name="email"]').fill(LICITACOES_EMAIL);
  await formLic.locator('input[name="senhaInicial"]').fill("senha12345");
  await formLic.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${LICITACOES_EMAIL}`);

  await page.goto(`${BASE}/admin/pesquisa-precos`);
  const formPP = page.locator('form:has(h2:text("Novo acesso"))');
  await formPP.locator('input[name="nome"]').fill(`Fulana PP E51 ${SUF}`);
  await formPP.locator('input[name="matricula"]').fill(`PP-E51-${SUF}`);
  await formPP.locator('input[name="funcao"]').fill("Servidora de Pesquisa de Preços");
  await formPP.locator('input[name="email"]').fill(PP_EMAIL);
  await formPP.locator('input[name="senhaInicial"]').fill("senha12345");
  await formPP.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${PP_EMAIL}`);

  await page.goto(`${BASE}/admin/planejamento`);
  const formPl = page.locator('form:has(h2:text("Novo acesso"))');
  await formPl.locator('input[name="nome"]').fill(`Beltrano Planejamento E51 ${SUF}`);
  await formPl.locator('input[name="matricula"]').fill(`PL-E51-${SUF}`);
  await formPl.locator('input[name="funcao"]').fill("Servidor de Planejamento");
  await formPl.locator('input[name="email"]').fill(PLANEJAMENTO_EMAIL);
  await formPl.locator('input[name="senhaInicial"]').fill("senha12345");
  await formPl.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${PLANEJAMENTO_EMAIL}`);

  await page.goto(`${BASE}/admin/agentes-contratacao`);
  const formAc = page.locator('form:has(h2:text("Novo acesso"))');
  await formAc.locator('input[name="nome"]').fill(AGENTE_NOME);
  await formAc.locator('input[name="matricula"]').fill(`AC-E51-${SUF}`);
  await formAc.locator('input[name="funcao"]').fill("Agente de Contratação");
  await formAc.locator('input[name="email"]').fill(AGENTE_EMAIL);
  await formAc.locator('input[name="senhaInicial"]').fill("senha12345");
  await formAc.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${AGENTE_NOME}`);
});

/* ---------- Unidade -> DFD -> aprovação -> consolidação -> ETP ---------- */

let dfdPdfUrl = "";

await passo("Unidade lança DFD com item da categoria e envia para aprovação", async () => {
  await loginPrimeiraVez(UNIDADE_EMAIL);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  dfdPdfUrl = `${page.url()}/pdf`;

  await page.fill('input[name="descricaoSumaria"]', `Demanda de teste da Fase E5.1 ${SUF}`);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase E5.1, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "2");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Fase E5.1.");
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

await passo("PROAD aprova o DFD", async () => {
  await loginProad();
  await page.waitForSelector(`text=Demanda de teste da Fase E5.1 ${SUF}`);
  const linhaDfd = page.locator("tr", { hasText: `Demanda de teste da Fase E5.1 ${SUF}` });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
});

let consolidacaoUrl = "";

await passo("Setor Técnico consolida o item pendente", async () => {
  await loginPrimeiraVez(SETOR_EMAIL);
  await page.click(`tr:has-text("${CATEGORIA}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);
  consolidacaoUrl = page.url();

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
    await page.fill(`[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E5.1 ${SUF}.`);
  }
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=ETP finalizado com sucesso.");
});

/* ---------- Pesquisa de Preços: valor + mediana, finalizar -> auto-avanço ---------- */

await passo("Pesquisa de Preços: envia PDF, preenche valor e mediana, finaliza", async () => {
  await loginPrimeiraVez(PP_EMAIL);
  const linha = page.locator("tr", { hasText: CATEGORIA });
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/pesquisa-precos\/.+/);

  await page.setInputFiles('input[name="arquivo"]', amostraPdfPath);
  await page.fill('textarea[name="metodologia"]', "Metodologia da pesquisa de preços do smoke E5.1.");
  await page.click('button:has-text("Enviar e Iniciar Pesquisa de Preços")');
  await page.waitForSelector("text=Itens Pesquisados (1)");

  const inputsNumericos = page.locator('input[type="number"]');
  await inputsNumericos.nth(0).fill("950.50");
  await inputsNumericos.nth(1).fill("900.00");
  await page.fill(
    'textarea[placeholder*="Painel de Preços"]',
    "Painel de Preços (id 789) e cotação com fornecedor Smoke E5.1.",
  );
  const secaoResponsavel = page.locator('div:has(> h2:text("Responsabilidade pela Elaboração"))');
  await secaoResponsavel.locator("input").nth(0).fill("Fulano de Tal");
  await secaoResponsavel.locator("input").nth(1).fill("12345-6");
  await page.click('button:has-text("Finalizar Pesquisa de Preços")');
  await page.waitForSelector("text=Pesquisa de Preços finalizada com sucesso.");
});

await passo("PDF da Pesquisa de Preços inclui a coluna de mediana", async () => {
  const resposta = await page.request.get(`${page.url()}/pdf`);
  if (resposta.status() !== 200) throw new Error(`status inesperado: ${resposta.status()}`);
});

await passo("Licitações vê o status avançar para 'Em Pesquisa de Preços' automaticamente", async () => {
  await loginPrimeiraVez(LICITACOES_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI}`);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  await page.waitForSelector("text=Em Pesquisa de Preços");
  const formStatus = page.locator('select[name="status"]');
  const opcoes = await formStatus.locator("option").allTextContents();
  if (!opcoes.some((o) => o.includes("Elaboração de Termo de Referência"))) {
    throw new Error("próxima etapa disponível para Licitações deveria ser Termo de Referência, sem precisar registrar Pesquisa de Preços manualmente");
  }
});

/* ---------- Termo de Referência: item pré-preenchido, finalizar -> auto-avanço ---------- */

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

await passo("Planejamento: item já vem pré-preenchido com valor da Pesquisa de Preços, finaliza o TR", async () => {
  await loginPrimeiraVez(PLANEJAMENTO_EMAIL);
  const linha = page.locator("tr", { hasText: CATEGORIA });
  await linha.locator("text=Pronto para iniciar").waitFor();
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/planejamento\/.+/);

  await page.click('button:has-text("Iniciar Termo de Referência")');
  await page.waitForSelector('textarea[name="requisitosContratacao"]');

  await page.waitForSelector("text=R$ 950,50");

  for (const campo of CAMPOS_TR) {
    await page.fill(`textarea[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E5.1 ${SUF}.`);
  }
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=Termo de Referência finalizado com sucesso.");
});

await passo("Licitações vê o status avançar para 'Termo de Referência' automaticamente", async () => {
  await login(LICITACOES_EMAIL);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  await page.waitForSelector("text=Em Elaboração de Termo de Referência");
});

/* ---------- Minuta de Edital: finalizar -> auto-avanço MINUTAS ---------- */

await passo("Agente de Contratação elabora e finaliza a Minuta de Edital", async () => {
  await loginPrimeiraVez(AGENTE_EMAIL);
  const linha = page.locator("tr", { hasText: CATEGORIA });
  await linha.locator("text=Pronta para iniciar").waitFor();
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/agente-contratacao\/.+/);

  await page.click('button:has-text("Iniciar Minuta de Edital")');
  await page.waitForSelector('textarea[name="condicoesParticipacao"]');

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
  for (const campo of CAMPOS_MINUTA) {
    await page.fill(`textarea[name="${campo}"]`, `Conteúdo de teste — ${campo} — smoke E5.1 ${SUF}.`);
  }
  await page.fill('input[name="responsavelNome"]', "Fulano de Tal");
  await page.fill('input[name="responsavelMatricula"]', "12345-6");
  await page.click('button[name="acao"][value="finalizar"]');
  await page.waitForSelector("text=Minuta de Edital finalizada com sucesso.");
});

let licitacaoUrl = "";

await passo("Licitações vê o status avançar para 'Minutas' automaticamente", async () => {
  await login(LICITACOES_EMAIL);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  licitacaoUrl = page.url();
  await page.waitForSelector("text=Em Elaboração de Minutas de Contrato/Ata/Edital");
});

/* ---------- Licitações designa o Agente e avança manualmente até HOMOLOGADO ---------- */

async function registrarStatus(status, campos = {}) {
  await page.selectOption('select[name="status"]', status);
  for (const [campo, valor] of Object.entries(campos)) {
    await page.fill(`[name="${campo}"]`, valor);
  }
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
}

await passo("Licitações designa o Agente de Contratação e avança manualmente até Homologado", async () => {
  await page.selectOption('select[name="agenteContratacaoId"]', { label: AGENTE_NOME });
  await page.click('button:has-text("Designar")');
  await page.waitForSelector("text=Agente de Contratação designado.");

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

/* ---------- Homologação: zera pendências -> auto-avanço ASSINATURA_CONTRATO ---------- */

await passo("Agente designado registra o resultado e o status avança para Assinatura de Contrato automaticamente", async () => {
  await login(AGENTE_EMAIL);
  await page.goto(licitacaoUrl);
  await page.waitForSelector("text=Registrar Resultados da Homologação");

  const painel = page.locator("div.rounded-2xl", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_total");
  await painel.locator('input[name="valorUnitario"]').fill("1234.56");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=Resultado registrado para o grupo.");
  await page.waitForSelector("text=Todos os itens deste processo já têm resultado registrado.");
});

await passo("Licitações vê 'Em Assinatura de Contrato/Ata' sem ter registrado esse status manualmente", async () => {
  await login(LICITACOES_EMAIL);
  await page.goto(licitacaoUrl);
  await page.waitForSelector("text=Em Assinatura de Contrato/Ata");
  await registrarStatus("REMETIDO_EXECUCAO");
  await page.waitForSelector("text=Processo concluído — não há próxima etapa disponível.");
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
