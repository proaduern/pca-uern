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

await passo("login PROAD", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
});

const dupEmail = `hotfix.dup.${Date.now()}@uern.br`;
await passo("Unidade: e-mail duplicado mostra mensagem, sem quebrar", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Original");
  await page.fill('input[name="email"]', dupEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('form:has(h2:text("Nova unidade")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${dupEmail}`);

  await page.fill('input[name="nome"]', "Duplicada");
  await page.fill('input[name="email"]', dupEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('form:has(h2:text("Nova unidade")) button:has-text("Salvar")');
  await page.waitForSelector("text=Já existe uma unidade cadastrada com este e-mail.");
});

await passo("Categoria: nome vazio mostra mensagem, sem quebrar", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.evaluate(() => {
    const input = document.querySelector('form input[name="nome"]');
    if (input) input.removeAttribute("required");
  });
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector("text=Informe o nome da categoria.");
});

let categoriaNome;
await passo("Catálogo: item sem categoria mostra mensagem, sem quebrar", async () => {
  categoriaNome = `Hotfix Cat ${Date.now()}`;
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.evaluate(() => {
    const select = document.querySelector('form select[name="categoriaId"]');
    if (select) select.removeAttribute("required");
  });
  await page.fill('input[name="item"]', "Item Hotfix");
  await page.fill('input[name="valor"]', "10");
  await page.click('form:has(h2:text("Novo item")) button:has-text("Salvar")');
  await page.waitForSelector("text=Preencha categoria, nome do item e um valor maior que zero.");
});

await passo("Catálogo: item duplicado mostra mensagem, sem quebrar", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('form:has(h2:text("Novo item")) select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Hotfix Duplicado");
  await page.fill('input[name="valor"]', "10");
  await page.click('form:has(h2:text("Novo item")) button:has-text("Salvar")');
  await page.waitForSelector("text=Item Hotfix Duplicado");

  await page.selectOption('form:has(h2:text("Novo item")) select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Hotfix Duplicado");
  await page.fill('input[name="valor"]', "20");
  await page.click('form:has(h2:text("Novo item")) button:has-text("Salvar")');
  await page.waitForSelector("text=Já existe um item com este nome nesta categoria.");
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
