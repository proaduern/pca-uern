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
const SUF = Date.now();
const ANO = 2080;
const CATEGORIA = `Material Fase5 Teste ${SUF}`;
const ITEM_ATA = `Peça Ata Teste ${SUF}`;
const ITEM_ESTOQUE = `Peça Estoque Teste ${SUF}`;
const ITEM_TROCA = `Peça Troca Teste ${SUF}`;
const SETOR_NOME = `Setor Fase5 Teste ${SUF}`;
const SETOR_EMAIL = `setor-fase5-${SUF}@uern.br`;
const UNIDADE_EMAIL = `unidade-fase5-${SUF}@uern.br`;
const LICITACOES_EMAIL = `licitacoes-fase5-${SUF}@uern.br`;
const ENTREGA_EMAIL = `entrega-fase5-${SUF}@uern.br`;
const GESTOR_ATA_EMAIL = `gestorata-fase5-${SUF}@uern.br`;
const PROCESSO_SEI_ATA = `00000.${SUF}/2080-00`;

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

async function loginPrimeiraVez(email) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "SenhaInicial123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "NovaSenhaForte123");
  await page.fill('input[name="confirmacao"]', "NovaSenhaForte123");
  await page.click('button:has-text("Definir senha e continuar")');
  await page.waitForURL(`${BASE}/`);
}

async function login(email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

/* ---------- setup ---------- */

await passo(`PROAD: cria e ativa PCA ${ANO} (cotas grandes)`, async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', String(ANO));
  await page.fill('input[name="cotaGeral"]', "500000000");
  await page.fill('input[name="cotaOP"]', "100000000");
  await page.fill('input[name="dataAbertura"]', `${ANO}-01-01`);
  await page.fill('input[name="dataFechamento"]', `${ANO}-01-31`);
  await page.click('button:has-text("Salvar")');
  const cardPca = page.locator("div.rounded-lg.border", { hasText: `PCA ${ANO}` }).first();
  const botaoAtivar = cardPca.locator('button:has-text("Ativar este PCA")');
  if (await botaoAtivar.count()) {
    await botaoAtivar.click();
    await page.waitForSelector(`text=PCA ${ANO} (ativo)`);
  }
  const checkboxExtra = cardPca.locator('label:has-text("Abertura extra geral") input[type="checkbox"]');
  if (!(await checkboxExtra.isChecked())) await checkboxExtra.check();
  await page.waitForTimeout(400);
});

await passo("PROAD: cria categoria e os 3 itens de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('input[name="nome"]', CATEGORIA);
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATEGORIA}`);

  await page.goto(`${BASE}/admin/catalogo`);
  for (const nome of [ITEM_ATA, ITEM_ESTOQUE, ITEM_TROCA]) {
    await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
    await page.fill('input[name="item"]', nome);
    await page.fill('input[name="valor"]', "1000");
    await page.click('button:has-text("Salvar")');
    await page.waitForSelector(`text=${nome}`);
  }
});

await passo("PROAD: cria setor técnico e atribui a categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', SETOR_NOME);
  await page.fill('input[name="email"]', SETOR_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${SETOR_EMAIL}`);

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: CATEGORIA });
  await linha.locator("select").first().selectOption({ label: SETOR_NOME });
  await page.waitForTimeout(500);
});

await passo("PROAD: cria Unidade OP, Licitações, Entrega e Gestor de Ata", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Fase5 Teste");
  await page.fill('input[name="email"]', UNIDADE_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "500000");
  await page.fill('input[name="cotaGeral"]', "500000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_EMAIL}`);

  await page.goto(`${BASE}/admin/licitacoes`);
  await page.fill('input[name="nome"]', `Licitacoes Fase5 Teste ${SUF}`);
  await page.fill('input[name="email"]', LICITACOES_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${LICITACOES_EMAIL}`);

  await page.goto(`${BASE}/admin/entrega`);
  await page.fill('input[name="nome"]', `Patrimonio Fase5 Teste ${SUF}`);
  await page.selectOption('select[name="subperfil"]', "PATRIMONIO");
  await page.fill('input[name="email"]', ENTREGA_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${ENTREGA_EMAIL}`);

  await page.goto(`${BASE}/admin/gestor-ata`);
  await page.fill('input[name="nome"]', `Gestor Ata Fase5 Teste ${SUF}`);
  await page.fill('input[name="email"]', GESTOR_ATA_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${GESTOR_ATA_EMAIL}`);
  await logout();
});

/* ---------- unidade lança DFD com os 3 itens ---------- */

let dfdUrl = "";
async function adicionarItem(itemCatalogo, enquadramento) {
  await page.selectOption('select[name="enquadramento"]', enquadramento);
  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.selectOption('select[name="itemCatalogoId"]', { label: `${itemCatalogo} — R$ 1.000,00` });
  await page.fill('input[name="quantidade"]', "1");
  await page.fill('textarea[name="correlacao"]', `Correlação de teste para ${itemCatalogo}.`);
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector(`text=${itemCatalogo}`);
}

await passo("Unidade lança DFD com os 3 itens (ata/estoque/troca)", async () => {
  await loginPrimeiraVez(UNIDADE_EMAIL);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  dfdUrl = page.url();

  await page.fill('input[name="descricaoSumaria"]', `Fase5 teste ${SUF}`);
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste com mais de cem caracteres para passar na validação de tamanho mínimo exigida pelo formulário.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', `${ANO}-06-01`);
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await adicionarItem(ITEM_ATA, "GERAL");
  await adicionarItem(ITEM_ESTOQUE, "OP");
  await adicionarItem(ITEM_TROCA, "OP");

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await logout();
});

await passo("PROAD: aprova o DFD", async () => {
  await loginProad();
  await page.waitForSelector(`text=Fase5 teste ${SUF}`);
  const linha = page.locator("tr", { hasText: `Fase5 teste ${SUF}` });
  await linha.locator('input[type="checkbox"]').check();
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Aprovar Selecionados em Lote")');
  await page.waitForTimeout(800);
  await logout();
});

/* ---------- Setor Técnico: consolida o item ATA sozinho, depois o item ESTOQUE sozinho ---------- */

let categoriaUrl = "";
await passo("Setor Técnico consolida o item de Ata (tipoContratacao ATA)", async () => {
  await loginPrimeiraVez(SETOR_EMAIL);
  await page.click(`tr:has-text("${CATEGORIA}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);
  categoriaUrl = page.url();

  const linhaAta = page.locator("tr", { hasText: ITEM_ATA });
  await linhaAta.locator('input[type="checkbox"]').check();

  await page.fill('input[name="processoSEI"]', PROCESSO_SEI_ATA);
  await page.fill('input[name="idDocumentoETP"]', "7777777");
  await page.fill('input[name="dataETP"]', `${ANO}-01-01`);
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "ATA");
  await page.fill('input[name="dataEsperadaConclusao"]', `${ANO}-03-10`);
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
});

await passo("Setor Técnico consolida o item de Estoque sozinho (deixa o item de Troca pendente)", async () => {
  await page.goto(categoriaUrl);

  const linhaEstoque = page.locator("tr", { hasText: ITEM_ESTOQUE });
  await linhaEstoque.locator('input[type="checkbox"]').check();

  await page.fill('input[name="processoSEI"]', `00000.${SUF}/2080-01`);
  await page.fill('input[name="idDocumentoETP"]', "7777778");
  await page.fill('input[name="dataETP"]', `${ANO}-01-01`);
  await page.selectOption('select[name="prioridade"]', "MEDIA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', `${ANO}-03-10`);
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
  await logout();
});

/* ---------- Licitações: leva o processo da Ata até REMETIDO_GESTOR_ATA ---------- */

async function registrarStatusLicitacao(status, campos = {}) {
  await page.selectOption('select[name="status"]', status);
  for (const [campo, valor] of Object.entries(campos)) {
    await page.fill(`[name="${campo}"]`, valor);
  }
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
}

await passo("Licitações: leva o processo de Ata até REMETIDO_GESTOR_ATA", async () => {
  await loginPrimeiraVez(LICITACOES_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI_ATA}`);
  await page.click(`tr:has-text("${PROCESSO_SEI_ATA}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);

  await registrarStatusLicitacao("PESQUISA_PRECOS", { responsavel: "Fulano da Silva" });
  await registrarStatusLicitacao("TERMO_REFERENCIA", { responsavel: "Fulano da Silva" });
  await registrarStatusLicitacao("MINUTAS", { responsavel: "Fulano da Silva" });
  await registrarStatusLicitacao("ANALISE_JURIDICA");
  await registrarStatusLicitacao("SESSAO_MARCADA", { dataSessao: `${ANO}-02-15`, agenteNome: "Ciclana Souza", agenteMatricula: "12345" });
  await registrarStatusLicitacao("ANALISE_PROPOSTAS");
  await registrarStatusLicitacao("HOMOLOGADO");
  await page.waitForSelector("text=Registrar Resultados da Homologação");
  const painel = page.locator("div.rounded-lg.border", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_total");
  await painel.locator('input[name="valorUnitario"]').fill("1000");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=Todos os itens deste processo já têm resultado registrado.");
  await registrarStatusLicitacao("ASSINATURA_CONTRATO");
  await registrarStatusLicitacao("REMETIDO_GESTOR_ATA");
  await page.waitForSelector("text=Processo remetido ao Gestor de Ata");
  await logout();
});

/* ---------- Gestor de Ata: solicita, PROAD autoriza ---------- */

await passo("Gestor de Ata: solicita autorização de execução", async () => {
  await loginPrimeiraVez(GESTOR_ATA_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI_ATA}`);
  await page.click('button:has-text("Solicitar Autorização à PROAD")');
  await page.waitForSelector("text=Aguardando Autorização da PROAD");
  await logout();
});

await passo("PROAD: autoriza a execução da ata", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/gestor-ata`);
  await page.waitForSelector(`text=${PROCESSO_SEI_ATA}`);
  await page.click('button:has-text("Autorizar Execução da Ata")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("Licitações: confirma que o processo de ata foi encaminhado para a Execução", async () => {
  await login(LICITACOES_EMAIL);
  await page.click(`tr:has-text("${PROCESSO_SEI_ATA}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  await page.waitForSelector("text=Encaminhado para Execução");
  await logout();
});

/* ---------- Atendimento por Estoque: propor + aprovar ---------- */

await passo("Entrega (Patrimônio): propõe atendimento por estoque para o item consolidado", async () => {
  await loginPrimeiraVez(ENTREGA_EMAIL);
  await page.waitForSelector(`text=${ITEM_ESTOQUE}`);
  const linha = page.locator("tr", { hasText: ITEM_ESTOQUE });
  await linha.locator('button:has-text("Propor Atendimento")').click();
  await page.waitForSelector("text=Minhas Propostas — Aguardando Análise");
  await logout();
});

await passo("PROAD: aprova o atendimento por estoque", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector(`text=Propostas de Atendimento por Estoque`);
  await page.click('button:has-text("Aprovar Atendimento")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("Demandante: item de estoque mostra entrega já autorizada pela PROAD", async () => {
  await login(UNIDADE_EMAIL);
  await page.goto(dfdUrl);
  await page.waitForSelector("text=Autorizado pela PROAD para Entrega, em Separação");
  await logout();
});

/* ---------- Troca de Item (OP): solicitar -> encaminhar -> confirmar disponibilidade -> autorizar ---------- */

await passo("Demandante: solicita troca do item (fora do catálogo)", async () => {
  await login(UNIDADE_EMAIL);
  await page.goto(dfdUrl);
  const cartaoTroca = page.locator("div.rounded-md.border-slate-200.p-3", { hasText: ITEM_TROCA });
  await cartaoTroca.locator('button:has-text("Solicitar Troca de Item (OP)")').click();
  // marca "fora do catálogo"
  await cartaoTroca.locator('input[type="checkbox"]').check();
  await cartaoTroca.locator('input[name="nomeCustom"]').fill(`Item Trocado Fase5 ${SUF}`);
  await cartaoTroca.locator('input[name="valorCustom"]').fill("1500");
  await cartaoTroca.locator('select[name="categoriaCustomId"]').selectOption({ label: CATEGORIA });
  await cartaoTroca.locator('select[name="tipoBemCustom"]').selectOption("PERMANENTE");
  await cartaoTroca.locator('textarea[name="justificativa"]').fill("O item atual não atende mais à necessidade da unidade.");
  await cartaoTroca.locator('button:has-text("Enviar Solicitação à PROAD")').click();
  await page.waitForSelector("text=Sua solicitação de troca está aguardando triagem da PROAD.");
  await logout();
});

await passo("PROAD: encaminha a troca ao Patrimônio", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector("text=Trocas de Item (OP) — Triagem Inicial");
  await page.click('button:has-text("Encaminhar ao Patrimônio")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("Entrega (Patrimônio): confirma disponibilidade da troca", async () => {
  await login(ENTREGA_EMAIL);
  await page.waitForSelector("text=Trocas de Item (OP) — Verificar Disponibilidade");
  await page.click('button:has-text("Confirmar Disponibilidade")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("PROAD: autoriza a troca final", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector("text=Trocas de Item (OP) — Autorização Final");
  await page.click('button:has-text("Autorizar Troca")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("Demandante: item original mostra 'Trocado' e o novo item já está autorizado para entrega", async () => {
  await login(UNIDADE_EMAIL);
  await page.goto(dfdUrl);
  await page.waitForSelector("text=Trocado por Outro Item (Troca de Item OP)");
  await page.waitForSelector(`text=Item Trocado Fase5 ${SUF}`);
  const cartaoNovo = page.locator("div.rounded-md.border-slate-200.p-3", { hasText: `Item Trocado Fase5 ${SUF}` });
  await cartaoNovo.locator("text=Autorizado pela PROAD para Entrega, em Separação").waitFor();
  await logout();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
console.log("dfdUrl:", dfdUrl);

await browser.close();
