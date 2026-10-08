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

await passo("login PROAD e criar segundo item de catalogo (para substituicao)", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: "Material de Escritório" });
  await page.fill('input[name="item"]', "Cadeira Presidente");
  await page.fill('input[name="valor"]', "700");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Cadeira Presidente");
});

await passo("criar setor tecnico proprio (nao vinculado) e atribuir categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', "Depto de Compras");
  await page.fill('input[name="email"]', "compras.setor@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=compras.setor@uern.br");

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: "Material de Escritório" });
  await linha.locator("select").selectOption({ label: "Depto de Compras" });
  await page.waitForTimeout(500);
});

await passo("criar unidade multi-perfil, com setor tecnico e licitacoes vinculados", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Multi-Perfil");
  await page.fill('input[name="email"]', "multiperfil@uern.br");
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.fill('input[name="cotaGeral"]', "50000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=multiperfil@uern.br");

  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', "Setor Vinculado Teste");
  await page.check('input[name="vinculado"]');
  await page.selectOption('select[name="unidadeId"]', { label: "Unidade Multi-Perfil (multiperfil@uern.br)" });
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Setor Vinculado Teste");

  await page.goto(`${BASE}/admin/licitacoes`);
  await page.fill('input[name="nome"]', "Diretoria de Licitações e Contratos");
  await page.check('input[name="vinculado"]');
  await page.selectOption('select[name="unidadeId"]', { label: "Unidade Multi-Perfil (multiperfil@uern.br)" });
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector("text=Diretoria de Licitações e Contratos");
});

await passo("logout e login como setor tecnico proprio (sem escolha de perfil)", async () => {
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
  await page.waitForSelector("text=Material de Escritório");
});

let categoriaUrl = "";
await passo("abrir categoria: ve item pendente do DFD aprovado", async () => {
  await page.click('tr:has-text("Material de Escritório") >> text=Abrir');
  await page.waitForURL(/\/consolidacao\/.+/);
  categoriaUrl = page.url();
  await page.waitForSelector("text=Cadeira ergonômica");
  await page.waitForSelector("text=Departamento de Teste");
});

await passo("adicionar item tecnico (sem DFD de origem)", async () => {
  await page.fill('input[name="item"]', "Licença de Software XPTO");
  await page.fill('input[name="valorUnit"]', "1000");
  await page.fill('input[name="quantidade"]', "1");
  await page.selectOption('select[name="tipoBem"]', "PERMANENTE");
  await page.fill('textarea[name="correlacao"]', "Necessária para o novo sistema de gestão do setor.");
  await page.click('button:has-text("Adicionar Item")');
  await page.waitForSelector("text=Item técnico adicionado.");
  await page.waitForSelector("text=Licença de Software XPTO");
  await page.waitForSelector("text=Incluído pelo setor técnico");
});

await passo("substituir o item do DFD por outro item do catalogo", async () => {
  await page
    .locator("tr", { hasText: "Cadeira ergonômica" })
    .locator('button:has-text("Substituir")')
    .click();
  await page.selectOption('select[name="novoItemCatalogoId"]', { label: "Cadeira Presidente — R$ 700,00" });
  await page.fill('textarea[name="justificativa"]', "O modelo ergonômico padrão está fora de linha; a Presidente atende igual.");
  await page.click('button:has-text("Confirmar Substituição")');
  await page.waitForSelector("text=Item substituído com sucesso.");
  await page.waitForSelector("text=Cadeira Presidente");
  await page.waitForSelector("text=Substituído pelo setor técnico (era: Cadeira ergonômica)");
});

await passo("selecionar os 2 itens pendentes e tentar consolidar com prazo invalido (menos de 60 dias)", async () => {
  const checkboxes = page.locator('input[type="checkbox"][name="itemDfdId"], input[type="checkbox"][name="itemTecnicoId"]');
  const total = await checkboxes.count();
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', "00000.000000/2026-00");
  await page.fill('input[name="dataETP"]', "2026-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2026-02-01");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=no mínimo 60 dias");
});

await passo("corrigir prazo para 63 dias e consolidar com sucesso", async () => {
  await page.fill('input[name="dataEsperadaConclusao"]', "2026-03-05");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
  await page.waitForSelector("text=Nenhum item pendente nesta categoria.");
  await page.waitForSelector("text=Consolidações Já Realizadas");
  const texto = await page.textContent("body");
  if (!texto.includes("00000.000000/2026-00")) throw new Error("processo SEI nao aparece no historico");
});

await passo("PROAD: PCA nao pode ser concluido sem codigo PCA preenchido", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  await page.goto(`${BASE}/admin/pca`);
  await page.waitForSelector("text=00000.000000/2026-00");
  await page.locator('label:has-text("Concluído")').locator('input[type="checkbox"]').check();
  await page.waitForTimeout(1000);
  // NOTA: a mensagem de erro em si não é confiável de checar na tela aqui —
  // ver bug pré-existente da Fase 1 documentado no relatório (PcaAcoes/
  // BotaoExcluir mostram "Minified React error" em vez da mensagem real em
  // build de produção, embora a validação do servidor esteja correta).
  // Confirmamos pelo estado real: recarrega e checa que continua "Em andamento".
  await page.goto(`${BASE}/admin/pca`);
  const texto = await page.textContent("body");
  if (!texto.includes("Em andamento")) throw new Error("PCA foi concluído mesmo sem código PCA — falha real de gating");
});

await passo("PROAD preenche codigo PCA e conclui com sucesso", async () => {
  const inputCodigo = page.locator("tr", { hasText: "00000.000000/2026-00" }).locator('input[type="text"]');
  await inputCodigo.fill("12345/2027");
  await inputCodigo.blur();
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/admin/pca`); // recarrega: a tentativa anterior falhou e nao persistiu o checkbox
  await page.locator('label:has-text("Concluído")').locator('input[type="checkbox"]').check();
  await page.waitForSelector("text=Concluído em");
});

await passo("login Licitacoes (vinculado) via escolha de perfil, ve a consolidacao", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "multiperfil@uern.br");
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Escolha o perfil");
  await page.click('button:has-text("Diretoria de Licitações e Contratos")');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Processos Consolidados");
  await page.waitForSelector("text=00000.000000/2026-00");
  await page.waitForSelector("text=Depto de Compras");
});

await passo("mesma conta multi-perfil: escolher Unidade demandante desta vez", async () => {
  await page.click('button:has-text("Sair")');
  await page.waitForURL(`${BASE}/login`);
  await page.fill('input[name="email"]', "multiperfil@uern.br");
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Escolha o perfil");
  await page.click('button:has-text("Unidade Multi-Perfil")');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Minhas Demandas");
});

console.log("--- erros de console/página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
console.log("categoriaUrl usada:", categoriaUrl);

await browser.close();
