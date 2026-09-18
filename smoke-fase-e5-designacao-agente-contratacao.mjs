import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const erros = [];
// Só "pageerror" (crash de fato) é monitorado — algumas telas administrativas
// pré-existentes (categorias/catálogo/licitações), de fases bem anteriores à
// E5, emitem um console.error de serialização de campos Decimal ao passar
// unidades para um Client Component; é um aviso pré-existente e não afeta o
// funcionamento, então não é tratado como falha aqui (mesmo padrão usado em
// smoke-fase3-licitacoes.mjs, que também visita essas telas).
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
const ANO = 9200 + (Date.now() % 700);
const SUF = Date.now();
const CATEGORIA = `Material Smoke E5 ${SUF}`;
const CATALOGO_ITEM = `Peça Smoke E5 ${SUF}`;
const SETOR_NOME = `Setor Smoke E5 ${SUF}`;
const SETOR_EMAIL = `smoke.e5.setor.${SUF}@uern.br`;
const UNIDADE_EMAIL = `smoke.e5.unidade.${SUF}@uern.br`;
const LICITACOES_NOME = `Licitacoes Smoke E5 ${SUF}`;
const LICITACOES_EMAIL = `smoke.e5.licitacoes.${SUF}@uern.br`;
const AGENTE_DESIGNADO_NOME = `Fulana Designada E5 ${SUF}`;
const AGENTE_DESIGNADO_EMAIL = `smoke.e5.agente.designado.${SUF}@uern.br`;
const AGENTE_OUTRO_NOME = `Beltrano Nao Designado E5 ${SUF}`;
const AGENTE_OUTRO_EMAIL = `smoke.e5.agente.outro.${SUF}@uern.br`;
const PROCESSO_SEI = `00000.${SUF}/${ANO}-00`;

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
  await page.fill('input[name="nome"]', "Unidade Smoke E5");
  await page.fill('input[name="email"]', UNIDADE_EMAIL);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_EMAIL}`);
});

await passo("criar acesso de Licitações e dois acessos de Agente de Contratação", async () => {
  await page.goto(`${BASE}/admin/licitacoes`);
  const formLic = page.locator('form:has(h2:text("Novo acesso"))');
  await formLic.locator('input[name="nome"]').fill(LICITACOES_NOME);
  await formLic.locator('input[name="email"]').fill(LICITACOES_EMAIL);
  await formLic.locator('input[name="senhaInicial"]').fill("senha12345");
  await formLic.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${LICITACOES_EMAIL}`);

  await page.goto(`${BASE}/admin/agentes-contratacao`);
  const formAc1 = page.locator('form:has(h2:text("Novo acesso"))');
  await formAc1.locator('input[name="nome"]').fill(AGENTE_DESIGNADO_NOME);
  await formAc1.locator('input[name="matricula"]').fill(`AC-E5-D-${SUF}`);
  await formAc1.locator('input[name="funcao"]').fill("Agente de Contratação");
  await formAc1.locator('input[name="email"]').fill(AGENTE_DESIGNADO_EMAIL);
  await formAc1.locator('input[name="senhaInicial"]').fill("senha12345");
  await formAc1.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${AGENTE_DESIGNADO_NOME}`);

  const formAc2 = page.locator('form:has(h2:text("Novo acesso"))');
  await formAc2.locator('input[name="nome"]').fill(AGENTE_OUTRO_NOME);
  await formAc2.locator('input[name="matricula"]').fill(`AC-E5-O-${SUF}`);
  await formAc2.locator('input[name="funcao"]').fill("Agente de Contratação");
  await formAc2.locator('input[name="email"]').fill(AGENTE_OUTRO_EMAIL);
  await formAc2.locator('input[name="senhaInicial"]').fill("senha12345");
  await formAc2.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${AGENTE_OUTRO_NOME}`);
});

/* ---------- Unidade lança DFD, PROAD aprova, Setor Técnico consolida ---------- */

await passo("Unidade lança DFD com item da categoria e envia para aprovação", async () => {
  await loginPrimeiraVez(UNIDADE_EMAIL);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);

  await page.fill('input[name="descricaoSumaria"]', `Demanda de teste da Fase E5 ${SUF}`);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase E5, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "2");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Fase E5.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("PROAD aprova o DFD", async () => {
  await loginProad();
  await page.waitForSelector(`text=Demanda de teste da Fase E5 ${SUF}`);
  const linhaDfd = page.locator("tr", { hasText: `Demanda de teste da Fase E5 ${SUF}` });
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

/* ---------- Licitações: designa o Agente de Contratação ---------- */

let licitacaoUrl = "";

await passo("Licitações: primeiro acesso, abre a consolidação e vê 'Nenhum agente designado'", async () => {
  await loginPrimeiraVez(LICITACOES_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI}`);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  licitacaoUrl = page.url();
  await page.waitForSelector("text=Nenhum agente designado ainda.");
});

await passo("Licitações: designa o Agente de Contratação para o processo", async () => {
  await page.selectOption('select[name="agenteContratacaoId"]', { label: AGENTE_DESIGNADO_NOME });
  await page.click('button:has-text("Designar")');
  await page.waitForSelector("text=Agente de Contratação designado.");
  await page.waitForSelector(`text=${AGENTE_DESIGNADO_NOME}`);
});

/* ---------- Licitações: avança o status até HOMOLOGADO ---------- */

async function registrarStatus(status, campos = {}) {
  await page.selectOption('select[name="status"]', status);
  for (const [campo, valor] of Object.entries(campos)) {
    await page.fill(`[name="${campo}"]`, valor);
  }
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
}

await passo("Licitações: avança o status até Homologado", async () => {
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

/* ---------- Acesso não designado é bloqueado ---------- */

await passo("Agente de Contratação não designado não enxerga o processo", async () => {
  await loginPrimeiraVez(AGENTE_OUTRO_EMAIL);
  const bodyHome = await page.locator("body").innerText();
  if (bodyHome.includes("Certames Designados a Você")) {
    throw new Error("agente não designado não deveria ver a seção de certames designados");
  }
  await page.goto(licitacaoUrl);
  const corpo = await page.locator("body").innerText();
  if (corpo.includes(PROCESSO_SEI)) {
    throw new Error("agente não designado conseguiu ver um processo que não é dele");
  }
});

/* ---------- Agente designado: acesso restrito + registra homologação ---------- */

await passo("Agente de Contratação designado vê o certame na home e abre", async () => {
  await loginPrimeiraVez(AGENTE_DESIGNADO_EMAIL);
  await page.waitForSelector("text=Certames Designados a Você");
  const secaoDesignados = page.locator("div.rounded-2xl", { hasText: "Certames Designados a Você" }).first();
  const linha = secaoDesignados.locator("tr", { hasText: PROCESSO_SEI });
  await linha.locator("text=Abrir").click();
  await page.waitForURL(/\/licitacoes\/.+/);
});

await passo("Agente designado não vê seções de gestão restritas a Licitações", async () => {
  const corpo = await page.locator("body").innerText();
  if (corpo.includes("Revisar Prioridade / Data Esperada de Conclusão")) {
    throw new Error("agente designado não deveria ver a seção de revisão de prioridade/prazo");
  }
  if (corpo.includes("Registrar Próximo Status do Processo")) {
    throw new Error("agente designado não deveria ver a seção de próximo status do processo");
  }
  const seletorDesignacao = await page.locator('select[name="agenteContratacaoId"]').count();
  if (seletorDesignacao !== 0) {
    throw new Error("agente designado não deveria poder alterar a designação");
  }
  await page.waitForSelector("text=Histórico de Status (Timeline)");
  await page.waitForSelector("text=Registrar Resultados da Homologação");
});

await passo("Agente designado registra o resultado de homologação do item", async () => {
  const painel = page.locator("div.rounded-2xl", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_total");
  await painel.locator('input[name="valorUnitario"]').fill("1234.56");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=Resultado registrado para o grupo.");
  await page.waitForSelector("text=Todos os itens deste processo já têm resultado registrado.");
});

/* ---------- Licitações continua enxergando e gerenciando tudo ---------- */

await passo("Licitações ainda vê o resultado registrado e pode gerenciar o processo", async () => {
  await login(LICITACOES_EMAIL);
  await page.goto(licitacaoUrl);
  await page.waitForSelector("text=Todos os itens deste processo já têm resultado registrado.");
  await page.waitForSelector("text=Revisar Prioridade / Data Esperada de Conclusão");
  await page.waitForSelector("text=Registrar Próximo Status do Processo");
  await page.waitForSelector(`text=${AGENTE_DESIGNADO_NOME}`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
