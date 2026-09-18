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
const categoriaNome = `Material Smoke C3 ${sufixo}`;
const unidadeEmail = `smoke.c3.unidade.${sufixo}@uern.br`;
const setorEmail = `smoke.c3.setor.${sufixo}@uern.br`;
const rubrica = `Rubrica Smoke C3 ${sufixo}`;

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
  const cartaoPca = page.locator(".rounded-2xl", { hasText: `PCA ${ANO} (ativo)` });
  await cartaoPca.locator('label:has-text("Abertura extra geral") input[type="checkbox"]').check();
  await page.waitForTimeout(500);
});

await passo("criar categoria e definir Classificação/Rubrica", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaNome);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaNome}`);

  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.getByRole("button", { name: "Editar", exact: true }).click();
  await linha.locator('input[name="classificacaoRubrica"]').fill(rubrica);
  await linha.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.waitForSelector(`text=${rubrica}`);
  await page.reload();
  const rubricaCelula = await page.locator("tr", { hasText: categoriaNome }).locator("td").nth(2).innerText();
  if (rubricaCelula.trim() !== rubrica) throw new Error("classificação/rubrica não persistiu");
});

await passo("criar item de catálogo na categoria", async () => {
  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
  await page.fill('input[name="item"]', "Item Smoke C3");
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Smoke C3");
});

await passo("criar setor técnico próprio e atribuir a categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', "Setor Smoke C3");
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${setorEmail}`);

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: categoriaNome });
  await linha.locator('select:not([name="modo"])').selectOption({ label: "Setor Smoke C3" });
  await page.waitForTimeout(500);
});

await passo("criar unidade de teste com cota geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Smoke C3");
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senhaInicial"]', "senha12345");
  await page.fill('input[name="cotaGeral"]', "5000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${unidadeEmail}`);
});

async function loginUnidade(senha) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', senha);
  await page.click('button[type="submit"]');
}

/** DFD com um único item Geral numa categoria — usado nos lotes extras que
 * testam o merge/não-merge de consolidações. */
async function unidadeCriarDfdComItemUnico(descricao, categoria, quantidade) {
  await loginUnidade("novaSenha123");
  await page.waitForURL(`${BASE}/`);

  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);

  await page.fill('input[name="descricaoSumaria"]', descricao);
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste do smoke test da Fase C3, com o tamanho mínimo exigido pelo sistema para ser aceita.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="categoriaId"]', { label: categoria });
  await page.waitForTimeout(200);
  await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
  await page.fill('input[name="quantidade"]', String(quantidade));
  await page.fill('textarea[name="correlacao"]', `Correlação de teste — ${descricao}.`);
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForTimeout(300);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
}

async function aprovarDfdPorDescricao(descricao) {
  await page.context().clearCookies();
  await loginProad();
  await page.waitForSelector(`text=${descricao}`);
  const linhaDfd = page.locator("tr", { hasText: descricao });
  await linhaDfd.locator('button:has-text("Aprovar")').click();
  await page.waitForTimeout(1000);
}

async function loginSetorTecnico() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', setorEmail);
  await page.fill('input[name="senha"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

/** Abre a consolidação da categoria, marca todos os itens pendentes e
 * consolida — usado nos lotes extras (a primeira consolidação, com o item
 * técnico, tem seu próprio passo mais abaixo por ser mais elaborada). */
async function setorTecnicoConsolidarPendentes(categoria, processoSEI) {
  await page.click(`tr:has-text("${categoria}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);

  const checkboxes = page.locator(
    'input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]',
  );
  const total = await checkboxes.count();
  if (total === 0) throw new Error("nenhum item pendente encontrado para consolidar");
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', processoSEI);
  await page.fill('input[name="dataETP"]', "2030-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
}

await passo(
  "login Unidade, criar DFD com itens Geral + Convênio + Recursos Extra e enviar",
  async () => {
    await loginUnidade("senha12345");
    await page.waitForURL(`${BASE}/trocar-senha`);
    await page.fill('input[name="novaSenha"]', "novaSenha123");
    await page.fill('input[name="confirmacao"]', "novaSenha123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);

    await page.click('button:has-text("+ Nova Demanda (DFD)")');
    await page.waitForURL(/\/dfd\/.+/);

    await page.fill('input[name="descricaoSumaria"]', "Demanda de teste da Fase C3 (PCA Consolidado)");
    await page.selectOption('select[name="prioridadeId"]', { index: 1 });
    await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
    await page.fill(
      'textarea[name="justificativa"]',
      "Justificativa de teste do smoke test da Fase C3, com o tamanho mínimo exigido pelo sistema para ser aceita.",
    );
    await page.selectOption('select[name="tipoDemanda"]', "NOVA");
    await page.fill('input[name="data"]', `${ANO}-06-01`);
    await page.click('button:has-text("Salvar dados gerais")');
    await page.waitForSelector("text=Salvo.");

    // Item 1: Geral -> Fonte 500
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Geral.");
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);

    // Item 2: Convênio
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.selectOption('select[name="enquadramento"]', "CONVENIO");
    await page.fill('input[name="convenioNumero"]', "123");
    await page.fill('input[name="convenioAno"]', String(ANO));
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Convênio.");
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);

    // Item 3: Recursos Extra
    await page.selectOption('select[name="categoriaId"]', { label: categoriaNome });
    await page.waitForTimeout(200);
    await page.selectOption('select[name="itemCatalogoId"]', { index: 1 });
    await page.selectOption('select[name="enquadramento"]', "RECURSOS_EXTRA");
    await page.fill('input[name="recursoExtraAgencia"]', "Banco Smoke");
    await page.fill('input[name="recursoExtraConta"]', "0000-1");
    await page.fill('input[name="quantidade"]', "1");
    await page.fill('textarea[name="correlacao"]', "Correlação de teste — item Recursos Extra.");
    await page.click('button:has-text("Adicionar item ao DFD")');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Enviar para aprovação da PROAD")');
    await page.waitForURL(`${BASE}/`);
  },
);

await passo("login PROAD e aprovar DFD", async () => {
  await aprovarDfdPorDescricao("Demanda de teste da Fase C3 (PCA Consolidado)");
});

await passo(
  "login Setor Técnico, adicionar item técnico e consolidar categoria com processo SEI e código futuro",
  async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', setorEmail);
    await page.fill('input[name="senha"]', "senha12345");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/trocar-senha`);
    await page.fill('input[name="novaSenha"]', "novaSenha123");
    await page.fill('input[name="confirmacao"]', "novaSenha123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);

    await page.click(`tr:has-text("${categoriaNome}") >> text=Abrir`);
    await page.waitForURL(/\/consolidacao\/.+/);
    await page.waitForSelector("text=Item Smoke C3");

    // Item técnico (sem DFD de origem) -> também conta como Fonte 500
    await page.fill('input[name="item"]', "Item Técnico Smoke C3");
    await page.fill('input[name="valorUnit"]', "500");
    await page.fill('input[name="quantidade"]', "1");
    await page.selectOption('select[name="tipoBem"]', "PERMANENTE");
    await page.fill('textarea[name="correlacao"]', "Necessário para o teste da Fase C3.");
    await page.click('button:has-text("Adicionar Item")');
    await page.waitForSelector("text=Item técnico adicionado.");

    const checkboxes = page.locator(
      'input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]',
    );
    const total = await checkboxes.count();
    for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

    await page.fill('input[name="processoSEI"]', `00000.000000/${ANO}-00`);
    await page.fill('input[name="dataETP"]', "2030-01-01");
    await page.selectOption('select[name="prioridade"]', "ALTA");
    await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
    await page.fill('input[name="dataEsperadaConclusao"]', "2030-03-05");
    await page.click('button:has-text("Consolidar Itens Selecionados")');
    await page.waitForSelector("text=Categoria consolidada com sucesso.");
  },
);

const DESC_LOTE2 = "Demanda de teste da Fase C3 - lote 2 (mesma categoria)";
await passo("Unidade cria 2º lote na mesma categoria (antes do código PNCP) e PROAD aprova", async () => {
  await unidadeCriarDfdComItemUnico(DESC_LOTE2, categoriaNome, 1);
  await aprovarDfdPorDescricao(DESC_LOTE2);
});

await passo(
  "Setor Técnico consolida o 2º lote — categoria agrupável (padrão) deve juntar na mesma consolidação",
  async () => {
    await loginSetorTecnico();
    await setorTecnicoConsolidarPendentes(categoriaNome, `00000.000000/${ANO}-00`);
  },
);

await passo("confirma no banco que o 2º lote se juntou à mesma consolidação (não criou uma segunda)", async () => {
  const { execSync } = await import("node:child_process");
  const saida = execSync(
    `sudo -u postgres psql -d pca -tA -c "SELECT count(*) FROM \\"ConsolidacaoTecnica\\" WHERE \\"pcaAno\\" = ${ANO} AND \\"categoriaId\\" = (SELECT id FROM \\"Categoria\\" WHERE nome = '${categoriaNome}');"`,
  )
    .toString()
    .trim();
  if (saida !== "1") throw new Error(`esperava 1 consolidação após o 2º lote (agrupável), veio ${saida}`);
});

await passo("PROAD preenche o código PCA (PNCP) da consolidação", async () => {
  await page.context().clearCookies();
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  const linha = page.locator("tr", { hasText: `00000.000000/${ANO}-00` });
  await linha.locator('input[type="text"]').fill("PNCP-C3-12345");
  await linha.locator('input[type="text"]').blur();
  await page.waitForTimeout(500);
});

const DESC_LOTE3 = "Demanda de teste da Fase C3 - lote 3 (pos codigo PNCP)";
await passo("Unidade cria 3º lote na mesma categoria (depois do código PNCP já preenchido) e PROAD aprova", async () => {
  await unidadeCriarDfdComItemUnico(DESC_LOTE3, categoriaNome, 1);
  await aprovarDfdPorDescricao(DESC_LOTE3);
});

await passo(
  "Setor Técnico consolida o 3º lote — consolidação anterior já tem código PNCP, deve virar uma NOVA linha",
  async () => {
    await loginSetorTecnico();
    await setorTecnicoConsolidarPendentes(categoriaNome, `00000.000001/${ANO}-00`);
  },
);

await passo("confirma no banco que o 3º lote criou uma segunda consolidação (não reaproveitou a coded)", async () => {
  const { execSync } = await import("node:child_process");
  const saida = execSync(
    `sudo -u postgres psql -d pca -tA -c "SELECT count(*) FROM \\"ConsolidacaoTecnica\\" WHERE \\"pcaAno\\" = ${ANO} AND \\"categoriaId\\" = (SELECT id FROM \\"Categoria\\" WHERE nome = '${categoriaNome}');"`,
  )
    .toString()
    .trim();
  if (saida !== "2") throw new Error(`esperava 2 consolidações após o 3º lote (a 1ª já tinha código PNCP), veio ${saida}`);
});

const categoriaObjeto = `Material Smoke C3 Objeto ${sufixo}`;
await passo("criar 2ª categoria marcada 'consolidar por objeto' (obras/serviços por objeto)", async () => {
  await page.context().clearCookies();
  await loginProad();
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('form:has(h2:text("Nova categoria")) input[name="nome"]', categoriaObjeto);
  await page.click('form:has(h2:text("Nova categoria")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${categoriaObjeto}`);

  const linha = page.locator("tr", { hasText: categoriaObjeto });
  await linha.locator('input[type="checkbox"]').check();
  await page.waitForTimeout(500);

  await linha.locator('select:not([name="modo"])').selectOption({ label: "Setor Smoke C3" });
  await page.waitForTimeout(500);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: categoriaObjeto });
  await page.fill('input[name="item"]', "Item Objeto Smoke C3");
  await page.fill('input[name="valor"]', "700");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Item Objeto Smoke C3");
});

const DESC_OBJETO_A = "Demanda de teste da Fase C3 - objeto A";
const DESC_OBJETO_B = "Demanda de teste da Fase C3 - objeto B";

// Objeto A é criado, aprovado E consolidado sozinho antes de o objeto B sequer
// existir — senão as duas chegariam pendentes juntas e a 1ª consolidação (que
// marca "todos os itens pendentes") levaria as duas de uma vez, inutilizando
// o teste de que a categoria "por objeto" nunca agrupa.
await passo("Unidade cria objeto A, PROAD aprova, Setor Técnico consolida sozinho", async () => {
  await unidadeCriarDfdComItemUnico(DESC_OBJETO_A, categoriaObjeto, 1);
  await aprovarDfdPorDescricao(DESC_OBJETO_A);
  await loginSetorTecnico();
  await setorTecnicoConsolidarPendentes(categoriaObjeto, `00000.000002/${ANO}-00`);
});

await passo("Unidade cria objeto B, PROAD aprova, Setor Técnico consolida sozinho", async () => {
  await unidadeCriarDfdComItemUnico(DESC_OBJETO_B, categoriaObjeto, 1);
  await aprovarDfdPorDescricao(DESC_OBJETO_B);
  await loginSetorTecnico();
  await setorTecnicoConsolidarPendentes(categoriaObjeto, `00000.000003/${ANO}-00`);
});

await passo("confirma no banco que categoria 'por objeto' NUNCA agrupa — 2 consolidações mesmo sem código PNCP", async () => {
  const { execSync } = await import("node:child_process");
  const saida = execSync(
    `sudo -u postgres psql -d pca -tA -c "SELECT count(*) FROM \\"ConsolidacaoTecnica\\" WHERE \\"pcaAno\\" = ${ANO} AND \\"categoriaId\\" = (SELECT id FROM \\"Categoria\\" WHERE nome = '${categoriaObjeto}');"`,
  )
    .toString()
    .trim();
  if (saida !== "2") throw new Error(`esperava 2 consolidações (por objeto, nunca agrupa), veio ${saida}`);
});

await passo("baixar PCA Consolidado (PDF) e validar arquivo + totais", async () => {
  await page.context().clearCookies();
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("Baixar PCA Consolidado (PDF)")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error("arquivo baixado não começa com a assinatura %PDF");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-pca-consolidado.pdf");
  console.log(`      (PDF salvo em /tmp/smoke-pca-consolidado.pdf, ${buffer.length} bytes)`);
});

await passo("baixar PCA Consolidado (XLSX) e validar arquivo", async () => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('a:has-text("XLSX")'),
  ]);
  const caminho = await download.path();
  if (!caminho) throw new Error("download não produziu arquivo local");
  const fs = await import("node:fs");
  const buffer = fs.readFileSync(caminho);
  if (buffer.subarray(0, 2).toString("latin1") !== "PK") {
    throw new Error("arquivo baixado não é um ZIP/XLSX válido (assinatura PK ausente)");
  }
  fs.copyFileSync(caminho, "/tmp/smoke-pca-consolidado.xlsx");
  console.log(`      (XLSX salvo em /tmp/smoke-pca-consolidado.xlsx, ${buffer.length} bytes)`);
});

await passo("PCA Consolidado bloqueado para quem não é ADMIN", async () => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', unidadeEmail);
  await page.fill('input[name="senha"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  const resp = await page.request.get(`${BASE}/admin/pca/${ANO}/consolidado-pdf`);
  if (resp.status() !== 403) throw new Error(`esperado 403 para Unidade, veio ${resp.status()}`);
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
console.log(`ANO usado: ${ANO}, categoria: ${categoriaNome}, rubrica: ${rubrica}`);

await browser.close();
