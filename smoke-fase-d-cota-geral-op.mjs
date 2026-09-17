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
const catClimatizacao = `Climatização Smoke D ${sufixo}`;
const catMobilia = `Mobília Smoke D ${sufixo}`;
const itemArCondicionado = `Ar-condicionado Smoke D ${sufixo}`;
const itemCarteiraLiberada = `Carteira Liberada Smoke D ${sufixo}`;
const itemArmarioComum = `Armário Comum Smoke D ${sufixo}`;
const unidadeEmail = `smoke.d.unidade.${sufixo}@uern.br`;

async function loginProad() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

async function loginUnidade() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
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

await passo("criar categoria Climatização e liberar a categoria inteira para Cota Geral", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', catClimatizacao);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${catClimatizacao}`);

  const linha = page.locator("tr", { hasText: catClimatizacao });
  await linha.locator('label:has-text("Categoria inteira liberada") input[type="checkbox"]').check();
  await page.waitForTimeout(300);
});

await passo("criar categoria Mobília (não liberada) com um item liberado e outro não", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', catMobilia);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${catMobilia}`);
});

await passo("criar itens de catálogo (Climatização e Mobília)", async () => {
  await page.goto(`${BASE}/admin/catalogo`);

  await page.selectOption('select[name="categoriaId"]', { label: catClimatizacao });
  await page.fill('input[name="item"]', itemArCondicionado);
  await page.fill('input[name="valor"]', "3000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${itemArCondicionado}`);

  await page.selectOption('select[name="categoriaId"]', { label: catMobilia });
  await page.fill('input[name="item"]', itemCarteiraLiberada);
  await page.fill('input[name="valor"]', "500");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${itemCarteiraLiberada}`);

  await page.selectOption('select[name="categoriaId"]', { label: catMobilia });
  await page.fill('input[name="item"]', itemArmarioComum);
  await page.fill('input[name="valor"]', "800");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${itemArmarioComum}`);

  const linhaCarteira = page.locator("tr", { hasText: itemCarteiraLiberada });
  await linhaCarteira.locator('label:has-text("Liberado p/ Cota Geral") input[type="checkbox"]').check();
  await page.waitForTimeout(300);
});

await passo("criar unidade elegível a Cota OP", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke D");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "5000");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

let dfdUrl = "";

await passo("login Unidade, trocar senha e criar DFD", async () => {
  await loginUnidade();
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  dfdUrl = page.url();

  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase D (restrição Cota Geral OP)");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase D, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");
});

await passo("Unidade OP lança item de Climatização em Cota Geral direto (categoria liberada)", async () => {
  await page.selectOption('select[name="categoriaId"]', { label: catClimatizacao });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "1");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — climatização liberada.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=Itens (1)");
});

await passo("Unidade OP lança o item de Mobília liberado em Cota Geral direto (item liberado)", async () => {
  await page.selectOption('select[name="categoriaId"]', { label: catMobilia });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { label: `${itemCarteiraLiberada} — R$ 500,00` });
  await page.fill('input[name="quantidade"]', "2");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item liberado de Mobília.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=Itens (2)");
});

await passo("Unidade OP é bloqueada ao tentar lançar o item de Mobília não liberado em Cota Geral", async () => {
  await page.selectOption('select[name="categoriaId"]', { label: catMobilia });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { label: `${itemArmarioComum} — R$ 800,00` });
  await page.fill('input[name="quantidade"]', "1");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste — item não liberado de Mobília.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=justifique a necessidade e solicite autorização da PROAD");
  await page.waitForSelector("text=Solicitar Autorização da PROAD");
  await page.waitForSelector("text=Itens (2)");
});

await passo("Unidade justifica e solicita autorização da PROAD", async () => {
  await page.fill('textarea[placeholder="Justifique a necessidade (mínimo 50 caracteres)"]', "a".repeat(60));
  await page.click('button:has-text("Solicitar Autorização")');
  await page.waitForSelector("text=Solicitação de autorização enviada à PROAD para análise.");
});

await passo("PROAD vê a solicitação pendente em /admin/solicitacoes-cota-geral", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/solicitacoes-cota-geral`);
  await page.waitForSelector(`text=${itemArmarioComum}`);
});

await passo("PROAD aceita a solicitação — item entra direto no DFD de origem", async () => {
  const cartao = page.locator(".rounded-md.border-slate-200", { hasText: itemArmarioComum });
  await cartao.locator('button:has-text("Aceitar e Incluir no DFD")').click();
  await page.waitForSelector("text=Nenhuma solicitação pendente no momento.");

  await page.goto(dfdUrl);
  await page.waitForSelector("text=Itens (3)");
});

await passo("histórico de solicitações mostra a solicitação como Aceita", async () => {
  await page.goto(`${BASE}/admin/solicitacoes-cota-geral`);
  const linha = page.locator("tr", { hasText: itemArmarioComum });
  await linha.locator("text=Aceita").waitFor();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
