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
const categoriaNome = `Material Smoke C3 ${sufixo}`;
const unidadeEmail = `smoke.c3.unidade.${sufixo}@uern.br`;
const setorEmail = `smoke.c3.setor.${sufixo}@uern.br`;
const rubrica = `Rubrica Smoke C3 ${sufixo}`;

async function loginProad() {
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
  await page.click('button:has-text("Ativar este PCA")');
  await page.waitForSelector(`text=PCA ${ANO} (ativo)`);
  const cartaoPca = page.locator(".rounded-2xl", { hasText: `PCA ${ANO} (ativo)` });
  await cartaoPca.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').check();
  await page.waitForTimeout(500);
});

await passo("criar categoria e definir Classificação/Rubrica", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  const linha = page.locator("tr", { hasText: categoriaNome });
  const inputRubrica = linha.locator('input[placeholder="Ex: Materiais de consumo"]');
  await inputRubrica.fill(rubrica);
  await inputRubrica.blur();
  await page.waitForTimeout(500);
  await page.reload();
  const valorSalvo = await page.locator("tr", { hasText: categoriaNome }).locator('input[placeholder="Ex: Materiais de consumo"]').inputValue();
  if (valorSalvo !== rubrica) throw new Error("classificação/rubrica não persistiu");
});

await passo("criar item de catálogo na categoria", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke C3");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke C3");
});

await passo("criar setor técnico próprio e atribuir a categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', "Setor Smoke C3");
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${setorEmail}`);

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator('select:not([name="modo"])').selectOption({ label: "Setor Smoke C3" });
  await page.waitForTimeout(500);
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke C3");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

await passo(
  "login Unidade, criar DFD com itens Geral + Convênio + Recursos Extra e enviar",
  async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', unidadeEmail);
    await page.fill('input[name="senha"]', "senha12345");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/trocar-senha`);
    await page.fill('input[name="novaSenha"]', "novaSenha123");
    await page.fill('input[name="confirmacao"]', "novaSenha123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);

    await page.click('button:has-text("+ Nova Demanda (DFD)")');
    await page.waitForURL(/\/dfd\/.+/);

    await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase C3 (PCA Consolidado)");
    await page.selectOption('select[name="prioridadeId"]', { index: 1 });
    await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
    await page.fill(
      'textarea[name="justificativa"]',
      "Justificativa de teste do smoke test da Fase C3, com o tamanho mínimo exigido pelo sistema para ser aceita.",
    );
    await page.selectOption('select[name="tipoDemanda"]', "NOVA");
    await page.fill('input[name="data"]', `${ANO}-06-01`);
    await page.click('button:has-text("Salvar dados gerais")');
    await page.waitForSelector("text=Salvo.");

    // Item 1: Geral -> Fonte 500
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Geral.");
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);

    // Item 2: Convênio
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.selectOption('select[name="enquadramento"]', "CONVENIO");
    await page.fill('input[name="convenioNumero"]', "123");
    await page.fill('input[name="convenioAno"]', String(ANO));
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Convênio.");
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);

    // Item 3: Recursos Extra
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.selectOption('select[name="enquadramento"]', "RECURSOS_EXTRA");
    await page.fill('input[name="recursoExtraAgencia"]', "Banco Smoke");
    await page.fill('input[name="recursoExtraConta"]', "0000-1");
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Recursos Extra.");
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Enviar para aprovação da PROAD")');
    await page.waitForURL(`${BASE}/`);
  },
);

await passo("login PROAD e aprovar DFD", async () => {
  await page.context().clearCookies();
  await loginProad();
  await page.waitForSelector("text=Demanda de teste da Fase C3 (PCA Consolidado)");
  const linhaDfd = page.locator("tr", { hasText: "Demanda de teste da Fase C3 (PCA Consolidado)" });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
});

await passo(
  "login Setor Técnico, adicionar item técnico e consolidar categoria com processo SEI e código futuro",
  async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', setorEmail);
    await page.fill('input[name="senha"]', "senha12345");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/trocar-senha`);
    await page.fill('input[name="novaSenha"]', "novaSenha123");
    await page.fill('input[name="confirmacao"]', "novaSenha123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);

    await page.click(`tr:has-text("${categoriaNome}") >> text=Abrir`);
    await page.waitForURL(/\/consolidacao\/.+/);
    await page.waitForSelector("text=Item Smoke C3");

    // Item técnico (sem DFD de origem) -> também conta como Fonte 500
    await page.fill('input[name="item"]', "Item Técnico Smoke C3");
    await page.fill('input[name="valorUnit"]', "500");
    await page.fill('input[name="quantidade"]', "1");
    await page.selectOption('select[name="tipoBem"]', "PERMANENTE");
    await page.fill('textarea[name="correlacao"]', "Necessário para o teste da Fase C3.");
    await page.click('button:has-text("Adicionar Item")');
    await page.waitForSelector("text=Item técnico adicionado.");

    const checkboxes = page.locator(
      'input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]',
    );
    const total = await checkboxes.count();
    for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

    await page.fill('input[name="processoSEI"]', `00000.000000/${ANO}-00`);
    await page.fill('input[name="idDocumentoETP"]', "1234567");
    await page.fill('input[name="dataETP"]', "2030-01-01");
    await page.selectOption('select[name="prioridade"]', "ALTA");
    await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
    await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
    await page.click('button:has-text("Consolidar Itens Selecionados")');
    await page.waitForSelector("text=Categoria consolidada com sucesso.");
  },
);

await passo("PROAD preenche o código PCA (PNCP) da consolidação", async () => {
  await page.context().clearCookies();
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  const linha = page.locator("tr", { hasText: `00000.000000/${ANO}-00` });
  await linha.locator('input[type="text"]').fill("PNCP-C3-12345");
  await linha.locator('input[type="text"]').blur();
  await page.waitForTimeout(500);
});

await passo("baixar PCA Consolidado (PDF) e validar arquivo + totais", async () => {
  await page.goto(`${BASE}/admin/pca`);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("Baixar PCA Consolidado (PDF)")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error("arquivo baixado não começa com a assinatura %PDF");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-pca-consolidado.pdf");
  console.log(`      (PDF salvo em /tmp/smoke-pca-consolidado.pdf, ${buffer.length} bytes)`);
});

await passo("baixar PCA Consolidado (XLSX) e validar arquivo", async () => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("XLSX")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 2).toString("latin1") !== "PK") {
    throw new Error("arquivo baixado não é um ZIP/XLSX válido (assinatura PK ausente)");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-pca-consolidado.xlsx");
  console.log(`      (XLSX salvo em /tmp/smoke-pca-consolidado.xlsx, ${buffer.length} bytes)`);
});

await passo("PCA Consolidado bloqueado para quem não é ADMIN", async () => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  const resp = await page.request.get(`${BASE}/admin/pca/${ANO}/consolidado-pdf`);
  if (resp.status() !== 403) throw new Error(`esperado 403 para Unidade, veio ${resp.status()}`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
console.log(`ANO usado: ${ANO}, categoria: ${categoriaNome}, rubrica: ${rubrica}`);

await browser.close();
