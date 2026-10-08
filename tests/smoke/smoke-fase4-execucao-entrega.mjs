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
const ANO = 2079;
const CATEGORIA = `Material Execucao Teste ${SUF}`;
const CATALOGO_ITEM = `Peça Exec ${SUF}`;
const SETOR_NOME = `Setor Exec Teste ${SUF}`;
const SETOR_EMAIL = `setor-exec-${SUF}@uern.br`;
const UNIDADE_EMAIL = `unidade-exec-${SUF}@uern.br`;
const LICITACOES_EMAIL = `licitacoes-exec-${SUF}@uern.br`;
const EXECUCAO_EMAIL = `execucao-teste-${SUF}@uern.br`;
const ENTREGA_EMAIL = `entrega-teste-${SUF}@uern.br`;
const PROCESSO_SEI = `00000.${SUF}/2079-00`;
const PROCESSO_SEI_EXEC = `00001.${SUF}/2079-00`;

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

// Login para reentradas depois da primeira vez — a senha já foi trocada
// para "NovaSenhaForte123" em loginPrimeiraVez.
async function login(email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="senha"]', "NovaSenhaForte123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

/* ---------- setup: PCA, categoria, catálogo, setor técnico, unidade, licitações ---------- */

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

await passo("PROAD: cria categoria de material com catálogo e o item de catálogo", async () => {
  await page.goto(`${BASE}/admin/categorias`);
  await page.fill('input[name="nome"]', CATEGORIA);
  await page.selectOption('select[name="tipo"]', "MATERIAL");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATEGORIA}`);

  await page.goto(`${BASE}/admin/catalogo`);
  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.fill('input[name="item"]', CATALOGO_ITEM);
  await page.fill('input[name="valor"]', "1000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);
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

await passo("PROAD: cria Unidade OP, Licitações, Execução e Entrega", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Exec Teste");
  await page.fill('input[name="email"]', UNIDADE_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "500000");
  await page.fill('input[name="cotaGeral"]', "500000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_EMAIL}`);

  await page.goto(`${BASE}/admin/licitacoes`);
  await page.fill('input[name="nome"]', `Licitacoes Exec Teste ${SUF}`);
  await page.fill('input[name="email"]', LICITACOES_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${LICITACOES_EMAIL}`);

  await page.goto(`${BASE}/admin/execucao`);
  await page.fill('input[name="nome"]', `Execucao Materiais Teste ${SUF}`);
  await page.selectOption('select[name="subperfil"]', "MATERIAIS_PATRIMONIO");
  await page.fill('input[name="email"]', EXECUCAO_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${EXECUCAO_EMAIL}`);

  await page.goto(`${BASE}/admin/entrega`);
  await page.fill('input[name="nome"]', `Entrega Patrimonio Teste ${SUF}`);
  await page.selectOption('select[name="subperfil"]', "PATRIMONIO");
  await page.fill('input[name="email"]', ENTREGA_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${ENTREGA_EMAIL}`);
  await logout();
});

/* ---------- unidade lança DFD com item OP quantidade 2 ---------- */

let dfdUrl = "";
await passo("Unidade lança DFD com item OP (quantidade 2)", async () => {
  await loginPrimeiraVez(UNIDADE_EMAIL);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  dfdUrl = page.url();

  await page.fill('input[name="descricaoSumaria"]', `Execução teste ${SUF}`);
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

  await page.selectOption('select[name="enquadramento"]', "OP");
  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.selectOption('select[name="itemCatalogoId"]', { label: `${CATALOGO_ITEM} — R$ 1.000,00` });
  await page.fill('input[name="quantidade"]', "2");
  await page.fill('textarea[name="correlacao"]', "Correlação de teste para o item de execução.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await logout();
});

await passo("PROAD: aprova o DFD", async () => {
  await loginProad();
  await page.waitForSelector(`text=Execução teste ${SUF}`);
  const linha = page.locator("tr", { hasText: `Execução teste ${SUF}` });
  await linha.locator('input[type="checkbox"]').check();
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Aprovar Selecionados em Lote")');
  await page.waitForTimeout(800);
  await logout();
});

await passo("Setor Técnico consolida o item pendente", async () => {
  await loginPrimeiraVez(SETOR_EMAIL);
  await page.click(`tr:has-text("${CATEGORIA}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);

  const checkboxes = page.locator('input[type="checkbox"][name="itemDfdId"]');
  const total = await checkboxes.count();
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', PROCESSO_SEI);
  await page.fill('input[name="dataETP"]', `${ANO}-01-01`);
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', `${ANO}-03-10`);
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
  await logout();
});

/* ---------- Licitações: leva o processo até "remetido à execução" ---------- */

async function registrarStatusLicitacao(status, campos = {}) {
  await page.selectOption('select[name="status"]', status);
  for (const [campo, valor] of Object.entries(campos)) {
    await page.fill(`[name="${campo}"]`, valor);
  }
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
}

await passo("Licitações: leva o processo até HOMOLOGADO com sucesso total", async () => {
  await loginPrimeiraVez(LICITACOES_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI}`);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);

  await registrarStatusLicitacao("PESQUISA_PRECOS", { responsavel: "Fulano da Silva" });
  await registrarStatusLicitacao("TERMO_REFERENCIA", { responsavel: "Fulano da Silva" });
  await registrarStatusLicitacao("MINUTAS", { responsavel: "Fulano da Silva" });
  await registrarStatusLicitacao("ANALISE_JURIDICA");
  await registrarStatusLicitacao("SESSAO_MARCADA", {
    dataSessao: `${ANO}-02-15`,
    agenteNome: "Ciclana Souza",
    agenteMatricula: "12345",
  });
  await registrarStatusLicitacao("ANALISE_PROPOSTAS");
  await registrarStatusLicitacao("HOMOLOGADO");
  await page.waitForSelector("text=Registrar Resultados da Homologação");

  const painel = page.locator("div.rounded-lg.border", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_total");
  await painel.locator('input[name="valorUnitario"]').fill("1000");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=Todos os itens deste processo já têm resultado registrado.");
});

await passo("Licitações: assinatura de contrato e encaminhamento para execução", async () => {
  await registrarStatusLicitacao("ASSINATURA_CONTRATO");
  await registrarStatusLicitacao("REMETIDO_EXECUCAO");
  await page.waitForSelector("text=Processo concluído — não há próxima etapa disponível.");
  await logout();
});

/* ---------- Execução: abre processo, avança até recebida em definitivo ---------- */

await passo("Execução: abre a homologação e cria o processo de execução", async () => {
  await loginPrimeiraVez(EXECUCAO_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI}`);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/execucao\/homologacao\/.+/);

  await page.locator('input.exec-item-chk, input[type="checkbox"]').first().check();
  await page.fill('input[name="processoSEIExecucao"]', PROCESSO_SEI_EXEC);
  await page.click('button:has-text("Abrir Processo de Execução com os Itens Selecionados")');
  // O revalidatePath disparado pela própria server action pode substituir a
  // árvore de componentes antes que o toast local seja observado — em vez
  // de esperar o texto efêmero, espera o efeito funcional: o item sai de
  // "pendentes" e aparece em "Itens Já em Execução", com link para o novo
  // processo (número do SEI de execução informado).
  await page.waitForSelector(`text=${PROCESSO_SEI_EXEC}`, { timeout: 60000 });
});

await passo("Execução: remetido ao fornecedor -> recebida em conferência -> recebida em definitivo", async () => {
  await page.click(`text=${PROCESSO_SEI_EXEC}`);
  await page.waitForURL(/\/execucao\/[^/]+$/);

  await page.selectOption('select[name="status"]', "REMETIDO_FORNECEDOR");
  await page.fill('input[name="dataEnvio"]', `${ANO}-01-05`);
  await page.fill('input[name="prazoDias"]', "10");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");

  await page.selectOption('select[name="status"]', "RECEBIDA_CONFERENCIA");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");

  // Recebimento total (sem fracionar) — o fracionamento é testado na Entrega, logo abaixo.
  await page.selectOption('select[name="status"]', "RECEBIDA_DEFINITIVO");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
  await page.waitForSelector("text=Processo de execução concluído — não há próxima etapa disponível.");
  await logout();
});

/* ---------- PROAD autoriza a entrega ---------- */

await passo("PROAD: autoriza a entrega do item recebido em definitivo", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);
  await page.locator('input.proad-autoriza-chk, input[type="checkbox"]').first().check();
  await page.click('button:has-text("Autorizar Entrega dos Itens Selecionados")');
  await page.waitForTimeout(600);
  await logout();
});

/* ---------- Entrega: avança status com entrega PARCIAL (1 de 2) ---------- */

let entregaUrl1 = "";
await passo("Entrega: avança para entrega em andamento -> entregue (parcial: 1 de 2)", async () => {
  await loginPrimeiraVez(ENTREGA_EMAIL);
  await page.click(`tr:has-text("${CATALOGO_ITEM}") >> text=Abrir`);
  await page.waitForURL(/\/entrega\/.+/);
  entregaUrl1 = page.url();

  await page.selectOption('select[name="status"]', "ENTREGA_ANDAMENTO");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status atualizado com sucesso.");

  await page.selectOption('select[name="status"]', "ENTREGUE");
  await page.fill('input[name="quantidadeEntregue"]', "1");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Entrega parcial registrada: 1 de 2");
  await logout();
});

await passo("PROAD: a unidade remanescente (1 de 2, ainda não entregue) volta à fila de autorização", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);
  await logout();
});

/* ---------- Demandante: contesta a primeira entrega ---------- */

await passo("Demandante: vê 'Aguardando sua Confirmação' e contesta a entrega", async () => {
  await login(UNIDADE_EMAIL);
  await page.goto(dfdUrl);
  await page.waitForSelector("text=Entregue — Aguardando sua Confirmação");
  // Neste ponto o item já foi dividido (1 de 2 entregue) — há 2 cartões de
  // item na página, então as ações precisam ser restritas ao cartão da parte
  // já entregue, não a qualquer "Ver linha do tempo"/"Contestar" da página.
  const cartao = page.locator("div.rounded-md.border-slate-200.p-3", { hasText: "Aguardando sua Confirmação" });
  await cartao.locator('button:has-text("Ver linha do tempo")').click();
  await page.waitForSelector("text=DFD Criado pela Unidade");
  await cartao.locator('button:has-text("Contestar Entrega")').click();
  await cartao.locator('textarea[name="motivo"]').fill("O material recebido está com defeito de fabricação.");
  await cartao.locator('button:has-text("Enviar Contestação")').click();
  await page.waitForSelector("text=Contestação em Análise pela Unidade de Entrega de Bens");
  await logout();
});

await passo("Entrega: aprova a contestação, encaminhando para ratificação da PROAD", async () => {
  await login(ENTREGA_EMAIL);
  await page.waitForSelector("text=Contestações Recebidas — Aguardando Sua Análise");
  await page.click('button:has-text("Aprovar Contestação")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("PROAD: ratifica a contestação (entrega não efetivada, reabre para nova tentativa)", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector("text=Contestações Aguardando Ratificação da Administração");
  await page.click('button:has-text("Ratificar (entrega não efetivada)")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("Entrega: reabre em 'entrega em andamento' e registra entregue de novo (desta vez sem contestação)", async () => {
  await login(ENTREGA_EMAIL);
  await page.goto(entregaUrl1);
  await page.waitForSelector("text=Entrega em Andamento");
  await page.selectOption('select[name="status"]', "ENTREGUE");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status atualizado com sucesso.");
  await logout();
});

await passo("Demandante: confirma o recebimento desta vez", async () => {
  await login(UNIDADE_EMAIL);
  await page.goto(dfdUrl);
  await page.waitForSelector("text=Entregue — Aguardando sua Confirmação");
  const cartao = page.locator("div.rounded-md.border-slate-200.p-3", { hasText: "Aguardando sua Confirmação" });
  await cartao.locator('button:has-text("Confirmar Recebimento")').click();
  await page.waitForSelector("text=Concluído — Entrega Confirmada por Você");
  await logout();
});

/* ---------- PROAD autoriza e Entrega entrega a unidade remanescente (1 de 2) ---------- */

await passo("PROAD: autoriza a entrega da unidade remanescente", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/entrega`);
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);
  await page.locator('input.proad-autoriza-chk, input[type="checkbox"]').first().check();
  await page.click('button:has-text("Autorizar Entrega dos Itens Selecionados")');
  await page.waitForTimeout(600);
  await logout();
});

await passo("Entrega: entrega a unidade remanescente por completo e demandante confirma", async () => {
  await login(ENTREGA_EMAIL);
  // A lista está ordenada por criação (mais recente primeiro) — a entrega
  // remanescente é a mais nova, então é a PRIMEIRA linha, não a última.
  const linhas = page.locator("tr", { hasText: CATALOGO_ITEM });
  await linhas.first().locator("text=Abrir").click();
  await page.waitForURL(/\/entrega\/.+/);
  await page.selectOption('select[name="status"]', "ENTREGA_ANDAMENTO");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status atualizado com sucesso.");
  await page.selectOption('select[name="status"]', "ENTREGUE");
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status atualizado com sucesso.");
  await logout();

  await login(UNIDADE_EMAIL);
  await page.goto(dfdUrl);
  await page.waitForSelector("text=Entregue — Aguardando sua Confirmação");
  await page.click('button:has-text("Confirmar Recebimento")');
  await page.waitForTimeout(600);
  const concluidos = await page.locator("text=Concluído — Entrega Confirmada por Você").count();
  if (concluidos < 2) throw new Error(`esperava as 2 partes do item concluídas, contei ${concluidos}`);
  await logout();
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
console.log("dfdUrl:", dfdUrl);

await browser.close();
