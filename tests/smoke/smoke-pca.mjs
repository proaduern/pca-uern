import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("console", (msg) => { if (msg.type() === "error") erros.push(`console.error: ${msg.text()}`); });

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

await passo("login como PROAD", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
});

await passo("criar PCA 2026 e ativar com abertura extra", async () => {
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', "2026");
  await page.fill('input[name="cotaGeral"]', "1000000");
  await page.fill('input[name="cotaOP"]', "200000");
  await page.fill('input[name="dataAbertura"]', "2026-01-01");
  await page.fill('input[name="dataFechamento"]', "2026-01-31");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=PCA 2026");
  await page.click('button:has-text("Ativar este PCA")');
  await page.waitForSelector("text=PCA 2026 (ativo)");
  await page.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').check();
  await page.waitForTimeout(500);
});

await passo("criar categoria Material de Escritorio", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('input[name="nome"]', "Material de Escritório");
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Material de Escritório");
});

await passo("criar item de catalogo Cadeira", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: "Material de Escritório" });
  await page.fill('input[name="item"]', "Cadeira ergonômica");
  await page.fill('input[name="valor"]', "500");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Cadeira ergonômica");
});

await passo("criar unidade de teste", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Departamento de Teste");
  await page.fill('input[name="email"]', "depto.teste@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.fill('input[name="cotaGeral"]', "50000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=depto.teste@uern.br");
});

await passo("logout PROAD", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
});

await passo("login como unidade com senha temporaria forca troca", async () => {
  await page.fill('input[name="email"]', "depto.teste@uern.br");
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);
});

await passo("criar DFD e preencher dados gerais", async () => {
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  await page.fill('input[name="descricaoSumaria"]', "Compra de cadeiras para o laboratório");
  await page.selectOption('select[name="prioridadeId"]', { label: "Alta" });
  await page.fill(
    'textarea[name="justificativa"]',
    "As cadeiras atuais do laboratório de informática estão quebradas e representam risco ergonômico para os servidores que utilizam o espaço diariamente durante longas jornadas de trabalho.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', "2026-06-01");
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");
});

await passo("adicionar item ao DFD", async () => {
  await page.selectOption('select[name="categoriaId"]', { label: "Material de Escritório" });
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "3");
  await page.fill(
    'textarea[name="correlacao"]',
    "Três cadeiras substituem as unidades quebradas identificadas na vistoria do laboratório.",
  );
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=R$ 1.500,00");
});

await passo("enviar DFD para aprovacao", async () => {
  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  const texto = await page.textContent("body");
  if (!texto.includes("Aguardando aprovação")) throw new Error("status esperado não apareceu");
});

await passo("logout unidade", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
});

await passo("login PROAD e aprovar DFD", async () => {
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Compra de cadeiras para o laboratório");
  await page.click('button:has-text("Aprovar")');
  await page.waitForTimeout(1000);
  const texto = await page.textContent("body");
  if (texto.includes("Compra de cadeiras para o laboratório") && texto.includes("1 pendentes")) {
    throw new Error("DFD ainda aparece como pendente após aprovar");
  }
});

console.log("--- erros de console/página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
