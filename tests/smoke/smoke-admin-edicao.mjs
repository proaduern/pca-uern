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

async function logout() {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
}

const DESCRICAO_TESTE = "DFD de teste para edição administrativa";

await passo("PROAD: reabrir a janela do PCA 2026 (pode estar concluído de outro teste)", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  const cardAtivo = page.locator("div", { hasText: "PCA 2026" }).first();
  if ((await page.locator("text=PCA 2026 (ativo)").count()) === 0) {
    await cardAtivo.locator('button:has-text("Ativar este PCA")').click();
    await page.waitForSelector("text=PCA 2026 (ativo)");
  }
  const concluidoCheckbox = page.locator('label:has-text("Concluído") input[type="checkbox"]').first();
  if (await concluidoCheckbox.isChecked()) {
    await concluidoCheckbox.uncheck();
    await page.waitForTimeout(500);
  }
  const extraCheckbox = page.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').first();
  if (!(await extraCheckbox.isChecked())) {
    await extraCheckbox.check();
    await page.waitForTimeout(500);
  }
  await logout();
});

await passo("preparar um DFD aprovado (unidade lança e PROAD aprova)", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "depto.teste@uern.br");
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  await page.fill('input[name="descricaoSumaria"]', DESCRICAO_TESTE);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Demanda criada apenas para validar a edição administrativa da PROAD, com texto acima de cem caracteres.",
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
    "Duas unidades para repor o mobiliário do setor conforme levantamento interno.",
  );
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await logout();

  await loginProad();
  await page.waitForSelector(`text=${DESCRICAO_TESTE}`);
  await page.click('button:has-text("Aprovar")');
  await page.waitForTimeout(500);
});

await passo("PROAD: localizar o DFD aprovado e abrir para editar", async () => {
  await page.goto(`${BASE}/admin/demandas`);
  await page.waitForSelector(`text=${DESCRICAO_TESTE}`);
  const linha = page.locator("tr", { hasText: DESCRICAO_TESTE });
  const status = await linha.locator("span").first().textContent();
  if (!status?.includes("Aprovado")) throw new Error(`esperava status Aprovado, veio "${status}"`);
  await linha.locator('a:has-text("Ver / Editar")').click();
  await page.waitForURL(/\/dfd\/.+/);
  await page.waitForSelector("text=Você está editando como PROAD");
});

await passo("PROAD adiciona item a um DFD ja aprovado: reverte para Aguardando Aprovação", async () => {
  await page.selectOption('select[name="categoriaId"]', { label: "Material de TI" });
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "1");
  await page.fill(
    'textarea[name="correlacao"]',
    "Item incluído pela PROAD para corrigir o DFD conforme conferência administrativa.",
  );
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=AGUARDANDO_APROVACAO");
  const texto = await page.textContent("body");
  if (texto.includes("APROVADO") && !texto.includes("AGUARDANDO_APROVACAO")) {
    throw new Error("DFD nao reverteu para aguardando aprovacao apos edicao da PROAD");
  }
});

await passo("PROAD: remover o item recem adicionado tambem funciona (mesma guarda de edicao)", async () => {
  const linhaItem = page.locator("div.rounded-md.border", { hasText: "Mouse sem fio" }).first();
  await linhaItem.locator('button:has-text("Excluir")').click();
  await page.waitForTimeout(500);
  const itens = await page.locator("text=Mouse sem fio").count();
  if (itens > 0) throw new Error("item nao foi removido pela PROAD");
});

await passo("PROAD aprova de novo e depois exclui o DFD pela lista de demandas", async () => {
  await page.goto(`${BASE}/`);
  await page.waitForSelector(`text=${DESCRICAO_TESTE}`);
  await page.click('button:has-text("Aprovar")');
  await page.waitForTimeout(500);

  await page.goto(`${BASE}/admin/demandas`);
  const linha = page.locator("tr", { hasText: DESCRICAO_TESTE });
  page.once("dialog", (d) => d.accept());
  await linha.locator('button:has-text("Excluir")').click();
  await page.waitForTimeout(500);
  const restante = await page.locator(`text=${DESCRICAO_TESTE}`).count();
  if (restante > 0) throw new Error("DFD nao foi excluido pela PROAD");
});

/* ---------- Renomear/mesclar categoria ---------- */

await passo("PROAD: renomear categoria simples", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: "Material de TI" });
  await linha.locator('button:has-text("Renomear/mesclar")').click();
  await linha.locator('input[name="novoNome"]').fill("Material de Informática");
  await linha.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.waitForSelector("text=Material de Informática");
});

await passo("PROAD: mesclar categoria (renomear para nome ja existente)", async () => {
  const linha = page.locator("tr", { hasText: "Material de Informática" });
  await linha.locator('button:has-text("Renomear/mesclar")').click();
  await linha.locator('input[name="novoNome"]').fill("Material de Escritório");
  await linha.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.waitForTimeout(500);
  const linhas = await page.locator("tr", { hasText: "Material de Escritório" }).count();
  const restouInformatica = await page.locator("text=Material de Informática").count();
  if (linhas !== 1 || restouInformatica > 0) {
    throw new Error("mesclagem nao produziu uma unica categoria com o nome de destino");
  }
});

/* ---------- Consolidação Geral ---------- */

await passo("PROAD: ve o relatorio de Consolidação Geral do PCA 2026", async () => {
  await page.goto(`${BASE}/admin/consolidacao`);
  await page.waitForSelector("text=Consolidação Geral do PCA — Ano 2026");
  await page.waitForSelector("text=Valor Global Cadastrado");
  await page.waitForSelector("text=Materiais por Categoria");
  await page.waitForSelector('button:has-text("Exportar CSV")');
});

/* ---------- Acesso restrito às páginas /admin/* ---------- */

await passo("Unidade nao-admin e redirecionada ao tentar acessar /admin/demandas direto", async () => {
  await logout();
  await page.fill('input[name="email"]', "depto.teste@uern.br");
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/admin/demandas`);
  await page.waitForURL(`${BASE}/`);
  const temTabela = await page.locator("text=Todas as Demandas Lançadas").count();
  if (temTabela > 0) throw new Error("unidade nao-admin conseguiu ver a pagina /admin/demandas");
  await logout();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
