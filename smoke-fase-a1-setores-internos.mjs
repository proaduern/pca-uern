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
// Sufixo único por execução: este banco de dev nunca é resetado (acumula
// fixtures de todos os smoke tests já rodados na sessão).
const ANO = 9000 + (Date.now() % 900);
const unidadeEmail = `smoke.a1.${Date.now()}@uern.br`;
const setorEmail = `smoke.a1.setor.${Date.now()}@uern.br`;

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

const categoriaNome = `Material Smoke A1 ${Date.now()}`;
await passo("criar categoria e item de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke A1");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke A1");
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke A1");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

async function logout() {
  await page.context().clearCookies();
}

await passo("login Unidade e criar setor interno com sub-cota de 1000", async () => {
  await logout();
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
  await page.fill('input[name="nome"]', "Setor Smoke A1");
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="cotaGeral"]', "1000");
  await page.click('button:has-text("Criar setor interno")');
  await page.waitForSelector(`text=${setorEmail}`);
});

await passo("Unidade: soma de cota dos setores não pode passar da cota da unidade", async () => {
  await page.fill('input[name="nome"]', "Setor Smoke A1 Excedente");
  await page.fill('input[name="email"]', `smoke.a1.excedente.${Date.now()}@uern.br`);
  await page.fill('input[name="cotaGeral"]', "9000"); // 1000 (já usado) + 9000 > 5000 da unidade
  await page.click('button:has-text("Criar setor interno")');
  await page.waitForSelector("text=excederia a cota Geral da unidade");
});

let dfdUrl;
await passo("login Setor Interno (senha padrão 123) e criar DFD", async () => {
  await logout();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senha"]', "123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "senhaSetor123");
  await page.fill('input[name="confirmacao"]', "senhaSetor123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  dfdUrl = page.url();
  await page.fill('input[name="descricaoSumaria"]', "Demanda lançada pelo setor interno");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test de setor interno, com o tamanho mínimo exigido pelo sistema para ser aceita como válida.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");
});

await passo("Setor Interno: item acima da sub-cota (1000) é bloqueado", async () => {
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "2"); // 2 x 1000 = 2000 > sub-cota 1000
  await page.fill('textarea[name="correlacao"]', "Correlação de teste para o item acima da sub-cota do setor.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=saldo de Cota Geral disponível do setor interno");
});

await passo("Setor Interno: item dentro da sub-cota (exatamente 1000) é aceito", async () => {
  await page.fill('input[name="quantidade"]', "1");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=R$ 1.000,00");
});

await passo("Setor Interno: envia para revisão da Unidade (não vai direto pra PROAD)", async () => {
  await page.click('button:has-text("Enviar para revisão da Unidade")');
  await page.waitForSelector("text=Aguardando revisão da Unidade");
});

await passo("Setor Interno: não consegue mais editar depois de enviado", async () => {
  await page.goto(dfdUrl);
  const temFormularioDeItem = await page.locator('button:has-text("Adicionar item ao DFD")').count();
  if (temFormularioDeItem > 0) throw new Error("setor ainda conseguiu ver o formulário de item após enviar");
  await page.waitForSelector("text=Aguarde a liberação para a PROAD");
});

await passo("Unidade: vê o DFD do setor anotado na lista e no detalhe", async () => {
  await logout();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Via setor interno: Setor Smoke A1");

  await page.goto(dfdUrl);
  await page.waitForSelector("text=DFD gerado na Unidade Unidade Smoke A1, por setor interno Setor Smoke A1");
});

await passo("Unidade: reabre para o setor, setor edita de novo, unidade libera para a PROAD", async () => {
  await page.click('button:has-text("Reabrir para o setor editar")');
  await page.waitForSelector('button:has-text("Enviar para aprovação da PROAD")');

  await logout();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senha"]', "senhaSetor123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.goto(dfdUrl);
  await page.waitForSelector('button:has-text("Enviar para revisão da Unidade")');
  await page.click('button:has-text("Enviar para revisão da Unidade")');
  await page.waitForSelector("text=Aguardando revisão da Unidade");

  await logout();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.goto(dfdUrl);
  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Aguardando aprovação");
});

await passo("PROAD: vê e aprova o DFD originado do setor interno", async () => {
  await logout();
  await loginProad();
  await page.waitForSelector("text=Demanda lançada pelo setor interno");
  await page.click('button:has-text("Aprovar")');
  await page.waitForTimeout(1000);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
