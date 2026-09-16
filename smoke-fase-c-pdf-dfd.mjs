import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

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
const ANO = 9000 + (Date.now() % 900);
const unidadeEmail = `smoke.c.${Date.now()}@uern.br`;

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

const categoriaNome = `Material Smoke C ${Date.now()}`;
await passo("criar categoria e item de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke C");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke C");
});

let unidadeId;
await passo("criar unidade de teste elegível a OP", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke C");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.fill('input[name="cotaOP"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

await passo("preencher responsável da unidade direto no banco (sem UI nesta fase)", async () => {
  const prisma = new PrismaClient();
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { email: unidadeEmail } });
  unidadeId = unidade.id;
  await prisma.unidade.update({
    where: { id: unidadeId },
    data: {
      responsavelNome: "Fulano de Tal Smoke",
      responsavelMatricula: "999888",
      responsavelTelefone: "(84) 91234-5678",
    },
  });
  await prisma.$disconnect();
});

let dfdUrl;
await passo("login Unidade e criar DFD com itens em 4 enquadramentos diferentes", async () => {
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

  await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase C (PDF do DFD)");
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase C, com o tamanho mínimo exigido pelo sistema para ser aceita como válida.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  async function adicionarItem(enquadramento, extra) {
    await page.selectOption('select[name="enquadramento"]', enquadramento);
    await page.waitForTimeout(200); // deixa o bloco condicional (convênio/recursos extra) renderizar
    if (extra) await extra();
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200); // idem para o bloco de item de catálogo/quantidade
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', `Correlação de teste — item ${enquadramento}.`);
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300); // aguarda o revalidatePath antes do próximo item
  }

  await adicionarItem("GERAL");
  await page.waitForSelector("text=Item Smoke C");
  await adicionarItem("OP");
  await adicionarItem("CONVENIO", async () => {
    await page.fill('input[name="convenioNumero"]', "CV-4242");
    await page.fill('input[name="convenioAno"]', String(ANO));
  });
  await adicionarItem("RECURSOS_EXTRA", async () => {
    await page.fill('input[name="recursoExtraAgencia"]', "1234-5");
    await page.fill('input[name="recursoExtraConta"]', "67890-1");
  });

  await page.waitForSelector("text=R$ 4.000,00"); // 4 itens x R$ 1.000,00
});

await passo("baixar DFD (PDF) e validar cabeçalhos/arquivo", async () => {
  await page.goto(dfdUrl);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("Baixar DFD (PDF)")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error("arquivo baixado não começa com a assinatura %PDF");
  }
  if (buffer.length < 500) throw new Error(`PDF suspeito de vazio: ${buffer.length} bytes`);
  fs.copyFileSync(caminho, "/tmp/smoke-dfd.pdf");
  console.log(`      (PDF salvo em /tmp/smoke-dfd.pdf, ${buffer.length} bytes)`);
});

await passo("baixar itens (XLSX) e validar assinatura do arquivo", async () => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("Baixar itens (XLSX)")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 2).toString("latin1") !== "PK") {
    throw new Error("arquivo baixado não é um ZIP/XLSX válido (assinatura PK ausente)");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-itens.xlsx");
  console.log(`      (XLSX salvo em /tmp/smoke-itens.xlsx, ${buffer.length} bytes)`);
});

await passo("DFD inexistente no endpoint de PDF dá 404, não erro genérico", async () => {
  const resp = await page.request.get(`${BASE}/dfd/id-que-nao-existe/pdf`);
  if (resp.status() !== 404) {
    throw new Error(`esperado 404 para DFD inexistente, veio ${resp.status()}`);
  }
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
