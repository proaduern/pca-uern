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
const unidadeEmail = `smoke.b.${Date.now()}@uern.br`;

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

const categoriaNome = `Material Smoke B ${Date.now()}`;
await passo("criar categoria e item de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke B");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke B");
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke B");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

let dfdUrl;
await passo("login Unidade e criar DFD", async () => {
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
});

await passo("textos explicativos de descrição sumária e justificativa aparecem", async () => {
  await page.waitForSelector("text=Estruturação de nova sala de aula");
  await page.waitForSelector("text=Campo destinado a descrever o problema");
});

await passo("data pretendida de entrega fora do ano do PCA é bloqueada", async () => {
  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase B");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase B, com o tamanho mínimo exigido pelo sistema para ser aceita como válida.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO - 1}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=ano do PCA");
});

await passo("data pretendida de entrega dentro do ano do PCA é aceita", async () => {
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");
});

// Nota: agência/conta são campos HTML `required` (mesmo padrão dos campos de
// convênio já existentes) — o navegador bloqueia o envio antes de chegar ao
// servidor quando vazios, então esse caminho é coberto pelo teste unitário
// de validarItemDfd (lib/__tests__/dfd-validacao.test.ts), não aqui.
await passo("Recursos Extra com agência/conta é aceito e aparece no item lançado", async () => {
  await page.selectOption('select[name="enquadramento"]', "RECURSOS_EXTRA");
  await page.waitForSelector("text=conta obrigatoriamente institucional");
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "1");
  await page.fill('input[name="recursoExtraAgencia"]', "1234-5");
  await page.fill('input[name="recursoExtraConta"]', "67890-1");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste do item de recursos extra.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=Agência: 1234-5 · Conta: 67890-1");
});

await passo("correlação com múltiplas linhas/colunas coladas preserva a estrutura ao exibir", async () => {
  await page.selectOption('select[name="enquadramento"]', "GERAL");
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', "1");
  const tabela = "Item\tQtd\tValor\nCadeira\t2\t500\nMesa\t1\t500";
  await page.fill('textarea[name="correlacao"]', tabela);
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector("text=Mesa");
  const texto = await page.locator("p.whitespace-pre-wrap").last().innerText();
  if (!texto.includes("\n")) throw new Error(`quebras de linha não preservadas na exibição: ${JSON.stringify(texto)}`);
  if (!texto.includes("\t")) throw new Error(`tabulações não preservadas na exibição: ${JSON.stringify(texto)}`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
