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

await passo("PROAD: criar PCA 2027 (necessario pela FK Dfd.ano -> Pca.ano)", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', "2027");
  await page.fill('input[name="cotaGeral"]', "1000000");
  await page.fill('input[name="cotaOP"]', "200000");
  await page.fill('input[name="dataAbertura"]', "2027-01-01");
  await page.fill('input[name="dataFechamento"]', "2027-01-31");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=PCA 2027");
});

/* ---------- Importação em lote de DFDs ---------- */

let resumoTexto = "";
await passo("PROAD: importa DFDs em lote via planilha (formato legado)", async () => {
  await page.goto(`${BASE}/admin/demandas`);
  await page.click('summary:has-text("Importar DFDs em Lote")');
  await page.fill('input[name="anoPca"]', "2027");
  await page.setInputFiles('input[name="arquivo"]', "/tmp/import-dfds-teste.xlsx");
  await page.click('button:has-text("Processar e Importar")');
  await page.waitForSelector("text=DFDs criados", { timeout: 15000 });
  resumoTexto = (await page.textContent("body")) ?? "";
});

await passo("importação: 4 DFDs criados (Material Escritório + Livros + Limpeza + fluxo unificado)", async () => {
  await page.waitForSelector("text=Todas as Demandas Lançadas (4)");
});

await passo("importação: 2 erros reportados (unidade inexistente + sem valor)", async () => {
  const bloco = resumoTexto.split("Erros (linhas não importadas)")[1] ?? "";
  if (!bloco.includes("2")) throw new Error("esperava 2 erros reportados");
  if (!resumoTexto.includes('Unidade demandante "Unidade Inexistente" não encontrada')) {
    throw new Error("erro de unidade nao encontrada nao apareceu");
  }
  if (!resumoTexto.includes("Sem valor unitário nem valor total")) {
    throw new Error("erro de sem valor nao apareceu");
  }
});

await passo("Todos os DFDs Lançados mostra os 4 DFDs importados, ja aguardando aprovacao", async () => {
  await page.reload();
  await page.waitForSelector("text=Material de Escritório — TI");
  await page.waitForSelector("text=Livros");
  await page.waitForSelector("text=Serviços de Limpeza");
  await page.waitForSelector("text=Diárias, Passagens e Hospedagens — Departamento de Teste");
  const linha = page.locator("tr", { hasText: "Material de Escritório — TI" });
  const status = await linha.locator("span").first().textContent();
  if (!status?.includes("Aguardando")) throw new Error("DFD importado nao esta aguardando aprovacao");
});


/* ---------- Atuar Como ---------- */

await passo("PROAD: Atuar Como a unidade 'Departamento de Teste'", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  const linha = page.locator("tr", { hasText: "Departamento de Teste" });
  await linha.locator('button:has-text("Atuar Como")').click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Atuando como:");
  await page.waitForSelector("text=Minhas Demandas");
  await page.waitForSelector("text=Material de Escritório — TI");
});

await passo("PROAD: volta para admin a partir do banner de impersonação", async () => {
  await page.click('button:has-text("Voltar para Admin")');
  await page.waitForSelector("text=Atuando como:", { state: "hidden" });
  await page.waitForSelector("text=Aprovação de DFDs");
});

/* ---------- Aprovação em lote ---------- */

await passo("PROAD: aprova 2 DFDs pendentes em lote", async () => {
  await page.goto(`${BASE}/`);
  const linhas = page.locator('tbody tr:has(input[type="checkbox"])');
  await linhas.nth(0).locator('input[type="checkbox"]').check();
  await linhas.nth(1).locator('input[type="checkbox"]').check();
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Aprovar Selecionados em Lote")');
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/admin/demandas`);
  const aprovados = await page.locator("tr", { hasText: "Aprovado" }).count();
  if (aprovados < 2) throw new Error(`esperava ao menos 2 DFDs aprovados, contei ${aprovados}`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
