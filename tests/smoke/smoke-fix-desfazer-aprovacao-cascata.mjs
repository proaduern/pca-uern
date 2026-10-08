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
const categoriaNome1 = `Material Smoke Cascata A ${sufixo}`;
const categoriaNome2 = `Material Smoke Cascata B ${sufixo}`;
const unidadeEmail = `smoke.cascata.unidade.${sufixo}@uern.br`;
const setorEmail = `smoke.cascata.setor.${sufixo}@uern.br`;
const setorNome = `Setor Smoke Cascata ${sufixo}`;

async function loginProad() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

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

async function aguardarHomeOuSelecionarPca() {
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/selecionar-pca");
  if (new URL(page.url()).pathname === "/selecionar-pca") {
    await page.click(`button:has-text("PCA ${ANO}")`);
    await page.waitForURL(`${BASE}/`);
  }
}

const { execSync } = await import("node:child_process");

function contarConsolidacoes(categoriaNome) {
  return execSync(
    `sudo -u postgres psql -d pca -tA -c "SELECT count(*) FROM \\"ConsolidacaoTecnica\\" WHERE \\"pcaAno\\" = ${ANO} AND \\"categoriaId\\" = (SELECT id FROM \\"Categoria\\" WHERE nome = '${categoriaNome}');"`,
  )
    .toString()
    .trim();
}

await passo("login PROAD", loginProad);

// A seleção de qual PCA a Unidade/Setor Técnico está atuando depende de um
// cookie "Secure" quando há mais de um PCA ativo — em https://localhost (dev
// real) funciona, mas em http://localhost puro (ambiente deste smoke test) o
// navegador descarta o cookie e a escolha nunca persiste. Desativando os
// PCAs de rodadas anteriores, este teste sempre roda com um único PCA ativo
// (não depende do cookie).
await passo("desativar PCAs ativos de rodadas anteriores", async () => {
  await page.goto(`${BASE}/admin/pca`);
  let seguro = 0;
  while (seguro < 50) {
    const botao = page.locator('button:has-text("Desativar (tira da lista de seleção)")').first();
    if ((await botao.count()) === 0) break;
    await botao.click();
    await page.waitForTimeout(300);
    seguro++;
  }
});

await passo(`criar e ativar PCA ${ANO}`, async () => {
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

for (const categoriaNome of [categoriaNome1, categoriaNome2]) {
  await passo(`criar categoria ${categoriaNome}`, async () => {
    await page.goto(`${BASE}/admin/categorias`);
    await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
    await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
    await page.waitForSelector(`text=${categoriaNome}`);
  });

  await passo(`criar item de catálogo em ${categoriaNome}`, async () => {
    await page.goto(`${BASE}/admin/catalogo`);
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.fill('input[name="item"]', "Item Smoke Cascata");
    await page.fill('input[name="valor"]', "1000");
    await page.click('button:has-text("Salvar")');
    await page.waitForSelector("text=Item Smoke Cascata");
  });
}

await passo("criar setor técnico próprio e atribuir as duas categorias", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', setorNome);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${setorEmail}`);

  await page.goto(`${BASE}/admin/categorias`);
  for (const categoriaNome of [categoriaNome1, categoriaNome2]) {
    const linha = page.locator("tr", { hasText: categoriaNome });
    await linha.locator('select:not([name="modo"])').selectOption({ label: setorNome });
    await page.waitForTimeout(300);
  }
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke Cascata");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "50000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

async function unidadeCriarDfdComItem(descricao, categoriaNome) {
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);

  await page.fill('input[name="descricaoSumaria"]', descricao);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da cascata de desfazer aprovação, com o tamanho mínimo exigido.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "3");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — cascata desfazer aprovação.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
}

async function proadAprovar(descricao) {
  await loginProad();
  await page.waitForSelector(`text=${descricao}`);
  const linhaDfd = page.locator("tr", { hasText: descricao });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
}

let senhaSetorTrocada = false;

async function setorConsolidar(categoriaNome, processoSEI) {
  if (senhaSetorTrocada) {
    await loginSetorTecnico("novaSenha123");
  } else {
    await loginSetorTecnico("senha12345");
    await page.waitForURL(`${BASE}/trocar-senha`);
    await page.fill('input[name="novaSenha"]', "novaSenha123");
    await page.fill('input[name="confirmacao"]', "novaSenha123");
    await page.click('button[type="submit"]');
    senhaSetorTrocada = true;
  }
  await aguardarHomeOuSelecionarPca();
  await page.click(`tr:has-text("${categoriaNome}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);
  const consolidacaoUrl = page.url();

  const checkboxes = page.locator(
    'input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]',
  );
  const total = await checkboxes.count();
  if (total === 0) throw new Error("nenhum item pendente encontrado para consolidar");
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', processoSEI);
  await page.fill('input[name="dataETP"]', "2030-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
  return consolidacaoUrl;
}

// --- Cenário A: consolidação ainda no estágio inicial (nada avançou) ---
// Reproduz exatamente o caso relatado: aprovar → consolidar → desfazer.
// Espera-se cascata automática: item some da consolidação, consolidação
// (que ficou vazia) é apagada.

const DESC_A = `Demanda Cascata A ${sufixo}`;

await passo("Unidade cria DFD (cenário A) e envia para aprovação", async () => {
  await loginUnidade("senha12345");
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await aguardarHomeOuSelecionarPca();
  await unidadeCriarDfdComItem(DESC_A, categoriaNome1);
});

await passo("PROAD aprova DFD (cenário A)", () => proadAprovar(DESC_A));

await passo("Setor Técnico consolida categoria A (nada mais é feito depois)", async () => {
  await setorConsolidar(categoriaNome1, `00000.000001/${ANO}-00`);
});

await passo("confirma no banco: 1 consolidação para a categoria A antes de desfazer", () => {
  const saida = contarConsolidacoes(categoriaNome1);
  if (saida !== "1") throw new Error(`esperava 1 consolidação antes de desfazer, veio ${saida}`);
});

await passo("PROAD desfaz aprovação do DFD A — deve cascatear automaticamente", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/demandas`);
  const linha = page.locator("tr", { hasText: DESC_A });
  await linha.locator('button:has-text("Desfazer Aprovação")').click();
  await page.waitForTimeout(1000);
  await page.waitForSelector("text=Aguardando aprovação");
});

await passo("confirma no banco: consolidação da categoria A foi apagada (ficou vazia)", () => {
  const saida = contarConsolidacoes(categoriaNome1);
  if (saida !== "0") throw new Error(`esperava 0 consolidações após desfazer (cascata automática), veio ${saida}`);
});

// --- Cenário B: consolidação já avançou (ETP iniciado) ---
// Desfazer aprovação deve ser BLOQUEADO, com mensagem explicando o motivo.

const DESC_B = `Demanda Cascata B ${sufixo}`;

await passo("Unidade cria DFD (cenário B) e envia para aprovação", async () => {
  await loginUnidade("novaSenha123");
  await aguardarHomeOuSelecionarPca();
  await unidadeCriarDfdComItem(DESC_B, categoriaNome2);
});

await passo("PROAD aprova DFD (cenário B)", () => proadAprovar(DESC_B));

let consolidacaoUrlB = "";
await passo("Setor Técnico consolida categoria B", async () => {
  consolidacaoUrlB = await setorConsolidar(categoriaNome2, `00000.000002/${ANO}-00`);
});

await passo("Setor Técnico inicia o ETP da consolidação B", async () => {
  await page.goto(consolidacaoUrlB);
  await page.waitForSelector("text=ETP — elaborar");
  await page.click("text=ETP — elaborar");
  await page.waitForURL(/\/consolidacao\/.+\/etp\/.+/);
  await page.click('button:has-text("Iniciar Estudo Técnico Preliminar")');
  await page.waitForSelector('textarea[name="necessidadeContratacao"]');
});

await passo("PROAD tenta desfazer aprovação do DFD B — deve ser BLOQUEADO", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/demandas`);
  const linha = page.locator("tr", { hasText: DESC_B });
  await linha.locator('button:has-text("Desfazer Aprovação")').click();
  await page.waitForSelector("text=Não é possível desfazer a aprovação");
});

await passo("confirma no banco: DFD B continua Aprovado, consolidação B intacta", async () => {
  const saidaDfd = execSync(
    `sudo -u postgres psql -d pca -tA -c "SELECT status FROM \\"Dfd\\" WHERE \\"descricaoSumaria\\" = '${DESC_B}';"`,
  )
    .toString()
    .trim();
  if (saidaDfd !== "APROVADO") throw new Error(`esperava DFD B continuar APROVADO (bloqueado), veio ${saidaDfd}`);
  const saidaConsolidacao = contarConsolidacoes(categoriaNome2);
  if (saidaConsolidacao !== "1") throw new Error(`esperava consolidação B intacta, veio ${saidaConsolidacao}`);
});

console.log("\n--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length > 0) process.exitCode = 1;

await browser.close();
