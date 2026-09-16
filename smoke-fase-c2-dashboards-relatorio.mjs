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
const ANO = 9000 + (Date.now() % 900);
const unidadeEmail = `smoke.c2.${Date.now()}@uern.br`;

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
  await page.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').check();
  await page.waitForTimeout(500);
});

const categoriaA = `Material Smoke C2 A ${Date.now()}`;
const categoriaB = `Material Smoke C2 B ${Date.now()}`;
await passo("criar duas categorias e itens de catálogo", async () => {
  for (const [cat, itemNome] of [
    [categoriaA, "Item Smoke C2 A"],
    [categoriaB, "Item Smoke C2 B"],
  ]) {
    await page.goto(`${BASE}/admin/categorias`);
    await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', cat);
    await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
    await page.waitForSelector(`text=${cat}`);

    await page.goto(`${BASE}/admin/catalogo`);
    await page.selectOption('select[name="categoriaId"]', { label: cat });
    await page.fill('input[name="item"]', itemNome);
    await page.fill('input[name="valor"]', "1000");
    await page.click('button:has-text("Salvar")');
    await page.waitForSelector(`text=${itemNome}`);
  }
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke C2");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

let dfdUrl;
await passo("login Unidade, criar DFD com 2 itens de categorias diferentes e enviar", async () => {
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
  dfdUrl = page.url();

  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase C2 (dashboards)");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase C2, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  for (const cat of [categoriaA, categoriaB]) {
    await page.selectOption('select[name="categoriaId"]', { label: cat });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', `Correlação de teste — ${cat}.`);
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);
  }

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("dashboard mostra cômputo por enquadramento (Geral R$ 2.000,00) e por categoria", async () => {
  await page.waitForSelector("text=Cômputo das demandas por enquadramento");
  await page.waitForSelector("text=Cômputo por categoria");
  const texto = await page.locator("body").innerText();
  if (!texto.includes("R$ 2.000,00")) throw new Error("total Geral esperado (R$ 2.000,00) não encontrado na tela");
  if (!texto.includes(categoriaA) || !texto.includes(categoriaB)) {
    throw new Error("categorias não aparecem no cômputo por categoria");
  }
});

await passo("baixar relatório geral de itens (PDF) e validar arquivo", async () => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("Relatório geral de itens (PDF)")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error("arquivo baixado não começa com a assinatura %PDF");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-relatorio.pdf");
  console.log(`      (PDF salvo em /tmp/smoke-relatorio.pdf, ${buffer.length} bytes)`);
});

await passo("baixar relatório geral de itens (XLSX) e validar arquivo", async () => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.click('a:has-text("XLSX")')]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 2).toString("latin1") !== "PK") {
    throw new Error("arquivo baixado não é um ZIP/XLSX válido (assinatura PK ausente)");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-relatorio.xlsx");
  console.log(`      (XLSX salvo em /tmp/smoke-relatorio.xlsx, ${buffer.length} bytes)`);
});

await passo("relatório em PDF/XLSX bloqueado para quem não é Unidade", async () => {
  await page.context().clearCookies();
  await loginProad();
  const resp = await page.request.get(`${BASE}/relatorio-itens/pdf`);
  if (resp.status() !== 403) throw new Error(`esperado 403 para PROAD, veio ${resp.status()}`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
