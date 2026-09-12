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

await passo("login PROAD e criar setor tecnico", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', "Depto de Compras");
  await page.fill('input[name="email"]', "compras.setor@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=compras.setor@uern.br");
});

await passo("atribuir categoria Material de Escritorio ao setor", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: "Material de Escritório" });
  await linha.locator("select").selectOption({ label: "Depto de Compras" });
  await page.waitForTimeout(500);
});

await passo("logout PROAD e login como setor tecnico com troca de senha", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "compras.setor@uern.br");
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);
});

await passo("abrir categoria e gerar consolidacao", async () => {
  await page.waitForSelector("text=Material de Escritório");
  await page.click('tr:has-text("Material de Escritório") >> text=Abrir');
  await page.waitForURL(/\/consolidacao\/.+/);
  await page.click('button:has-text("Atualizar consolidação")');
  await page.waitForSelector("text=linha(s) nova(s)");
  await page.waitForSelector("text=Cadeira ergonômica");
  await page.waitForSelector("text=Quantidade total: 3");
  await page.waitForSelector("text=R$ 1.500,00");
});

await passo("ver origem por unidade e enquadramento", async () => {
  await page.click("text=Ver origem por unidade e enquadramento");
  await page.waitForSelector("text=Departamento de Teste");
  await page.waitForSelector("text=Geral");
});

await passo("aprovar item consolidado", async () => {
  await page.click('button:has-text("Aprovar")');
  await page.waitForSelector("text=Aprovado · Depto de Compras");
});

await passo("logout setor tecnico e criar segunda unidade com novo pedido do mesmo item", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Departamento de Teste 2");
  await page.fill('input[name="email"]', "depto.teste2@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.fill('input[name="cotaGeral"]', "50000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=depto.teste2@uern.br");

  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "depto.teste2@uern.br");
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);

  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  await page.fill('input[name="descricaoSumaria"]', "Mais cadeiras para outro laboratório");
  await page.selectOption('select[name="prioridadeId"]', { label: "Alta" });
  await page.fill(
    'textarea[name="justificativa"]',
    "Este segundo laboratório de informática também precisa urgentemente de cadeiras ergonômicas novas para os servidores que utilizam o espaço diariamente.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', "2026-06-01");
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: "Material de Escritório" });
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "2");
  await page.fill(
    'textarea[name="correlacao"]',
    "Duas cadeiras para substituir as unidades danificadas deste outro laboratório.",
  );
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=R$ 1.000,00");

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
});

await passo("PROAD aprova o segundo DFD", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Mais cadeiras para outro laboratório");
  await page
    .locator("tr", { hasText: "Mais cadeiras para outro laboratório" })
    .locator('button:has-text("Aprovar")')
    .click();
  await page.waitForTimeout(500);
});

await passo("consolidacao nao altera linha aprovada; cria rascunho separado", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "compras.setor@uern.br");
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.click('tr:has-text("Material de Escritório") >> text=Abrir');
  await page.waitForURL(/\/consolidacao\/.+/);
  await page.click('button:has-text("Atualizar consolidação")');
  await page.waitForSelector("text=linha(s) nova(s)");

  const texto = await page.textContent("body");
  if (!texto.includes("Quantidade total: 3")) throw new Error("linha aprovada original (qtd 3) sumiu ou mudou");
  if (!texto.includes("Quantidade total: 2")) throw new Error("nova linha rascunho (qtd 2) não apareceu");
  if (!texto.includes("Aprovado · Depto de Compras")) throw new Error("linha original perdeu status aprovado");
});

console.log("--- erros de console/página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
