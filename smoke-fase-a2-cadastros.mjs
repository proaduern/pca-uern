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

async function loginProad() {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

await passo("login PROAD", loginProad);

let unidadeEmail;
await passo("PROAD: criar unidade de teste", async () => {
  unidadeEmail = `smoke.a2.${Date.now()}@uern.br`;
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('form:has(button:text("Salvar")) >> nth=0 >> input[name="nome"]', "Unidade Smoke A2");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

await passo("PROAD: editar unidade com dados do responsável", async () => {
  const linha = page.locator("tr", { hasText: unidadeEmail });
  await linha.getByText("Editar", { exact: true }).click();
  await linha.locator('input[name="responsavelNome"]').fill("Fulano de Tal");
  await linha.locator('input[name="responsavelMatricula"]').fill("12345-6");
  await linha.locator('input[name="responsavelTelefone"]').fill("(84) 99999-0000");
  await linha.getByRole("button", { name: "Salvar" }).click();
  await page.waitForTimeout(500);
});

await passo("PROAD: criar categoria MATERIAL sem catálogo exige tipo de bem", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  const nomeCat = `Obras Smoke ${Date.now()}`;
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', nomeCat);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="classificacaoRubrica"]', "4.4.9.0.51 Obras");
  await page.check('form:has(h2:text("Nova categoria")) #semItem');
  await page.selectOption('form:has(h2:text("Nova categoria")) select[name="tipoBemPadrao"]', "PERMANENTE");
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${nomeCat}`);
  const linha = page.locator("tr", { hasText: nomeCat });
  await linha.getByText("Permanente", { exact: true }).waitFor();
  await linha.getByText("4.4.9.0.51 Obras", { exact: true }).waitFor();
});

await passo("PROAD: editar categoria (trocar rubrica e teto anual)", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: "Livros" }).first();
  const existeLivros = (await linha.count()) > 0;
  const alvo = existeLivros ? linha : page.locator("tbody tr").first();
  await alvo.getByText("Editar", { exact: true }).click();
  const form = alvo.locator("form", { hasText: "Classificação" });
  await form.locator('input[name="classificacaoRubrica"]').fill("Rubrica Editada Smoke");
  await form.getByRole("button", { name: "Salvar" }).click();
  await page.waitForTimeout(500);
  await page.waitForSelector("text=Rubrica Editada Smoke");
});

let categoriaComCatalogoNome;
await passo("PROAD: criar categoria MATERIAL com catálogo (pré-requisito do próximo passo)", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  categoriaComCatalogoNome = `Material Smoke ${Date.now()}`;
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaComCatalogoNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaComCatalogoNome}`);
});

await passo("PROAD: criar item de catálogo e depois editá-lo", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  const nomeItem = `Item Smoke ${Date.now()}`;
  await page.selectOption('form:has(h2:text("Novo item")) select[name="categoriaId"]', {
    label: categoriaComCatalogoNome,
  });
  await page.fill('form:has(h2:text("Novo item")) input[name="item"]', nomeItem);
  await page.fill('form:has(h2:text("Novo item")) input[name="valor"]', "123.45");
  await page.click('form:has(h2:text("Novo item")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${nomeItem}`);

  const linha = page.locator("tr", { hasText: nomeItem });
  await linha.getByText("Editar", { exact: true }).click();
  const novoNome = `${nomeItem} Editado`;
  await linha.locator('input[name="item"]').fill(novoNome);
  await linha.locator('input[name="valor"]').fill("321.00");
  await linha.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.waitForSelector(`text=${novoNome}`);
  await page.waitForSelector("text=R$ 321,00");
});

await passo("Unidade: preencher dados do responsável em Dados da Unidade", async () => {
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

  await page.goto(`${BASE}/dados-unidade`);
  await page.fill('input[name="responsavelNome"]', "Ciclana da Silva");
  await page.fill('input[name="responsavelMatricula"]', "99999-1");
  await page.fill('input[name="responsavelTelefone"]', "(84) 98888-1111");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Salvo.");
  await page.reload();
  const valor = await page.inputValue('input[name="responsavelNome"]');
  if (valor !== "Ciclana da Silva") throw new Error(`esperava persistir o nome, veio "${valor}"`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
