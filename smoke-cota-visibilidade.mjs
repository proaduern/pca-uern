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

// Categorias "sem item" aparecem no select com o sufixo " (sem item — só valor)".
const CAT_OP = "Material OP Teste (sem item — só valor)";
const CAT_TETO = "Material Cota Anual Teste (sem item — só valor)";
const CAT_FORA_PCA = "Material Fora do PCA Teste (sem item — só valor)";

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

async function loginUnidadePrimeiraVez(email) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);
}

async function abrirNovaDemanda() {
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
}

async function preencherDadosGerais(descricao) {
  await page.fill('input[name="descricaoSumaria"]', descricao);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Demanda criada apenas para validar o motor de cota/saldo recem implementado, com texto acima de cem caracteres.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', "2027-06-01");
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");
}

async function adicionarItem({ categoria, enquadramento, valor, esperarErro, esperarTexto }) {
  if (categoria) await page.selectOption('select[name="categoriaId"]', { label: categoria });
  if (enquadramento) await page.selectOption('select[name="enquadramento"]', enquadramento);
  await page.fill('input[name="itemNomeLivre"]', "Item de teste");
  await page.fill('input[name="valorLivre"]', String(valor));
  await page.fill('textarea[name="correlacao"]', "Correlação de teste para o item de validação de cota.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  if (esperarErro) {
    await page.waitForSelector(`text=${esperarTexto}`);
  } else {
    await page.waitForTimeout(700);
    const erro = await page.locator("text=Valor excede").count();
    if (erro > 0) throw new Error("item foi rejeitado mas deveria ter sido aceito");
  }
}

/* ---------- Motor de cota/saldo (item-add em adicionarItemDfdAction) ---------- */

await passo("login PROAD e criar PCA 2027 (cotas pequenas para forcar os limites)", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', "2027");
  await page.fill('input[name="cotaGeral"]', "6000");
  await page.fill('input[name="cotaOP"]', "3000");
  await page.fill('input[name="dataAbertura"]', "2027-01-01");
  await page.fill('input[name="dataFechamento"]', "2027-01-31");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=PCA 2027");
  await page.click('button:has-text("Ativar este PCA")');
  await page.waitForSelector("text=PCA 2027 (ativo)");
  await page.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').first().check();
  await page.waitForTimeout(500);
});

await passo("criar categorias de teste (uma com teto anual, uma fora do PCA)", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('input[name="nome"]', "Material OP Teste");
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.check('input[name="semItem"]');
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Material OP Teste");

  await page.fill('input[name="nome"]', "Material Cota Anual Teste");
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.check('input[name="semItem"]');
  await page.fill('input[name="saldoAnualGlobal"]', "800");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Material Cota Anual Teste");

  await page.fill('input[name="nome"]', "Material Fora do PCA Teste");
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.check('input[name="semItem"]');
  await page.check('input[name="ignoraPCA"]');
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Material Fora do PCA Teste");
});

await passo("criar Unidade A (elegivel OP, cota apertada)", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Cota A");
  await page.fill('input[name="email"]', "cotaa@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "2500");
  await page.fill('input[name="cotaGeral"]', "6000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=cotaa@uern.br");
});

await passo("criar Unidade B (elegivel OP, cota folgada — vai esbarrar no teto do PCA)", async () => {
  await page.fill('input[name="nome"]', "Unidade Cota B");
  await page.fill('input[name="email"]', "cotab@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "5000");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=cotab@uern.br");
});

await passo("criar Unidade C (cota geral aberta, sem elegibilidade OP)", async () => {
  await page.fill('input[name="nome"]', "Unidade Cota Aberta");
  await page.fill('input[name="email"]', "cotac@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.selectOption('select[name="cotaTipo"]', "ABERTA");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=cotac@uern.br");
});

await passo("logout PROAD e login Unidade A", async () => {
  await logout();
  await loginUnidadePrimeiraVez("cotaa@uern.br");
  await abrirNovaDemanda();
  await preencherDadosGerais("Teste de cota Unidade A");
});

await passo("OP acima da cota da unidade (2500) deve falhar", async () => {
  await adicionarItem({
    categoria: CAT_OP,
    enquadramento: "OP",
    valor: 3000,
    esperarErro: true,
    esperarTexto: "Cota OP disponível da unidade",
  });
});

await passo("OP dentro da cota da unidade (exatamente 2500) deve passar", async () => {
  await adicionarItem({ categoria: CAT_OP, enquadramento: "OP", valor: 2500 });
});

await passo("Geral acima do teto anual da categoria (800) deve falhar", async () => {
  await adicionarItem({
    categoria: CAT_TETO,
    enquadramento: "GERAL",
    valor: 900,
    esperarErro: true,
    esperarTexto: "saldo anual disponível para a categoria",
  });
});

await passo("Geral dentro do teto anual da categoria (exatamente 800) deve passar", async () => {
  await adicionarItem({ categoria: CAT_TETO, enquadramento: "GERAL", valor: 800 });
});

await passo("enviar DFD da Unidade A e PROAD aprova (para consumir saldo do PCA)", async () => {
  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await logout();
  await loginProad();
  await page.waitForSelector("text=Teste de cota Unidade A");
  await page.click('button:has-text("Aprovar")');
  await page.waitForTimeout(800);
  await logout();
});

await passo("login Unidade B: OP acima do subsaldo OP do PCA (restam 500) deve falhar", async () => {
  await loginUnidadePrimeiraVez("cotab@uern.br");
  await abrirNovaDemanda();
  await preencherDadosGerais("Teste de cota Unidade B");

  await adicionarItem({
    categoria: CAT_OP,
    enquadramento: "OP",
    valor: 600,
    esperarErro: true,
    esperarTexto: "subsaldo OP disponível no PCA",
  });
});

await passo("OP exatamente no subsaldo do PCA (500) deve passar", async () => {
  await adicionarItem({ categoria: CAT_OP, enquadramento: "OP", valor: 500 });
});

await passo("Geral acima do saldo geral do PCA (restam 2200) deve falhar", async () => {
  await adicionarItem({
    categoria: CAT_OP,
    enquadramento: "GERAL",
    valor: 2800,
    esperarErro: true,
    esperarTexto: "saldo disponível da Cota PCA Geral",
  });
});

await passo("Geral exatamente no saldo geral do PCA (2200) deve passar — PCA fica com saldo zerado", async () => {
  await adicionarItem({ categoria: CAT_OP, enquadramento: "GERAL", valor: 2200 });
  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await logout();
  await loginProad();
  await page.waitForSelector("text=Teste de cota Unidade B");
  await page.click('button:has-text("Aprovar")');
  await page.waitForTimeout(800);
  await logout();
});

await passo("Unidade C (cota aberta): item Geral em categoria comum falha por saldo do PCA zerado", async () => {
  await loginUnidadePrimeiraVez("cotac@uern.br");
  await abrirNovaDemanda();
  await preencherDadosGerais("Teste de cota Unidade C");

  await adicionarItem({
    categoria: CAT_OP,
    enquadramento: "GERAL",
    valor: 10,
    esperarErro: true,
    esperarTexto: "saldo disponível da Cota PCA Geral",
  });
});

await passo("Unidade C: mesmo item numa categoria 'ignoraPCA' passa mesmo com o PCA zerado", async () => {
  await adicionarItem({ categoria: CAT_FORA_PCA, enquadramento: "GERAL", valor: 999999 });
  await logout();
});

/* ---------- Visibilidade de catálogo/categoria por unidade ---------- */

await passo("PROAD: criar categoria e itens de catalogo restritos", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('input[name="nome"]', "Categoria Restrita Teste");
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Categoria Restrita Teste");

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: "Categoria Restrita Teste" });
  await page.fill('input[name="item"]', "Item Livre Teste");
  await page.fill('input[name="valor"]', "10");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Livre Teste");

  await page.selectOption('select[name="categoriaId"]', { label: "Categoria Restrita Teste" });
  await page.fill('input[name="item"]', "Item Restrito Teste");
  await page.fill('input[name="valor"]', "10");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Restrito Teste");
});

await passo("PROAD: criar Unidade Vis A e Unidade Vis B", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Vis A");
  await page.fill('input[name="email"]', "visa@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=visa@uern.br");

  await page.fill('input[name="nome"]', "Unidade Vis B");
  await page.fill('input[name="email"]', "visb@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=visb@uern.br");
});

await passo("PROAD: restringe 'Categoria Restrita Teste' para SOMENTE 'Unidade Vis A'", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: "Categoria Restrita Teste" });
  await linha.locator('select[name="modo"]').selectOption("SOMENTE");
  await page.waitForTimeout(200);
  await linha.locator('select[name="unidadeId"]').selectOption({ label: "Unidade Vis A" });
  await linha.locator('button:has-text("Salvar visibilidade")').click();
  await page.waitForTimeout(500);
});

await passo("PROAD: restringe o item 'Item Restrito Teste' com EXCETO 'Unidade Vis A' (override por item)", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  const linha = page.locator("tr", { hasText: "Item Restrito Teste" });
  await linha.locator('select[name="modo"]').selectOption("EXCETO");
  await page.waitForTimeout(200);
  await linha.locator('select[name="unidadeId"]').selectOption({ label: "Unidade Vis A" });
  await linha.locator('button:has-text("Salvar visibilidade")').click();
  await page.waitForTimeout(500);
  await logout();
});

await passo("Unidade Vis A: ve a categoria (SOMENTE a inclui), ve Item Livre, NAO ve Item Restrito (override EXCETO)", async () => {
  await loginUnidadePrimeiraVez("visa@uern.br");
  await abrirNovaDemanda();

  const categorias = await page.locator('select[name="categoriaId"] option').allTextContents();
  if (!categorias.some((o) => o.includes("Categoria Restrita Teste"))) {
    throw new Error("categoria SOMENTE deveria estar visivel para a unidade incluida");
  }

  await page.selectOption('select[name="categoriaId"]', { label: "Categoria Restrita Teste" });
  const itens = await page.locator('select[name="itemCatalogoId"] option').allTextContents();
  if (!itens.some((o) => o.includes("Item Livre Teste"))) {
    throw new Error("item sem restricao propria deveria herdar a visibilidade da categoria e aparecer");
  }
  if (itens.some((o) => o.includes("Item Restrito Teste"))) {
    throw new Error("item com override EXCETO deveria estar oculto para esta unidade");
  }
  await logout();
});

await passo("Unidade Vis B: NAO ve a categoria (SOMENTE nao a inclui)", async () => {
  await loginUnidadePrimeiraVez("visb@uern.br");
  await abrirNovaDemanda();

  const categorias = await page.locator('select[name="categoriaId"] option').allTextContents();
  if (categorias.some((o) => o.includes("Categoria Restrita Teste"))) {
    throw new Error("categoria restrita apareceu para unidade fora da lista SOMENTE");
  }
  await logout();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
