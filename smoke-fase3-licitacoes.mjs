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
const CATEGORIA = `Material Homolog Teste ${SUF}`;
const CATALOGO_ITEM = `Peça XPTO ${SUF}`;
const SETOR_NOME = `Setor Homolog Teste ${SUF}`;
const SETOR_EMAIL = `setor-homolog-${SUF}@uern.br`;
const UNIDADE_OP_EMAIL = `unidade-op-${SUF}@uern.br`;
const UNIDADE_GERAL_EMAIL = `unidade-geral-${SUF}@uern.br`;
const LICITACOES_NOME = `Licitacoes Homolog Teste ${SUF}`;
const LICITACOES_EMAIL = `licitacoes-homolog-${SUF}@uern.br`;
const PROCESSO_SEI = `00000.${SUF}/2077-00`;

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

/* ---------- setup: PCA, categoria, catálogo, setor técnico, unidades ---------- */

await passo("PROAD: cria e ativa PCA 2077 (cotas grandes)", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/pca`);
  await page.fill('input[name="ano"]', "2077");
  // Números bem acima de qualquer alocação acumulada por outros smoke tests
  // já rodados neste banco (nunca é resetado, só somado).
  await page.fill('input[name="cotaGeral"]', "500000000");
  await page.fill('input[name="cotaOP"]', "100000000");
  await page.fill('input[name="dataAbertura"]', "2077-01-01");
  await page.fill('input[name="dataFechamento"]', "2077-01-31");
  await page.click('button:has-text("Salvar")');
  const cardPca = page.locator("div.rounded-lg.border", { hasText: "PCA 2077" }).first();
  // Este ano é reaproveitado entre execuções deste script — se já estiver
  // ativo de uma rodada anterior, o botão "Ativar este PCA" nem aparece.
  const botaoAtivar = cardPca.locator('button:has-text("Ativar este PCA")');
  if (await botaoAtivar.count()) {
    await botaoAtivar.click();
    await page.waitForSelector("text=PCA 2077 (ativo)");
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

let categoriaUrl = "";
await passo("PROAD: cria setor técnico e atribui a categoria", async () => {
  await page.goto(`${BASE}/admin/setores-tecnicos`);
  await page.fill('input[name="nome"]', SETOR_NOME);
  await page.fill('input[name="email"]', SETOR_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${SETOR_EMAIL}`);

  await page.goto(`${BASE}/admin/categorias`);
  const linha = page.locator("tr", { hasText: CATEGORIA });
  // A linha também tem o select de visibilidade (name="modo") — o de setor
  // técnico não tem name, mas é o primeiro select da linha.
  await linha.locator("select").first().selectOption({ label: SETOR_NOME });
  await page.waitForTimeout(500);
});

await passo("PROAD: cria Unidade OP e Unidade Geral", async () => {
  await page.goto(`${BASE}/admin/unidades`);
  await page.fill('input[name="nome"]', "Unidade Homolog OP");
  await page.fill('input[name="email"]', UNIDADE_OP_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.check('input[name="elegivelCotaOP"]');
  await page.fill('input[name="cotaOP"]', "500000");
  await page.fill('input[name="cotaGeral"]', "500000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_OP_EMAIL}`);

  await page.fill('input[name="nome"]', "Unidade Homolog Geral");
  await page.fill('input[name="email"]', UNIDADE_GERAL_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.fill('input[name="cotaGeral"]', "500000");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${UNIDADE_GERAL_EMAIL}`);

  await page.goto(`${BASE}/admin/licitacoes`);
  await page.fill('input[name="nome"]', LICITACOES_NOME);
  await page.fill('input[name="email"]', LICITACOES_EMAIL);
  await page.fill('input[name="senhaInicial"]', "SenhaInicial123");
  await page.click('button:has-text("Salvar")');
  await page.waitForSelector(`text=${LICITACOES_EMAIL}`);
  await logout();
});

/* ---------- unidades lançam DFDs (OP qtd 3, Geral qtd 4) ---------- */

async function lancarDfd(email, enquadramento, quantidade) {
  await loginPrimeiraVez(email);
  await page.click('button:has-text("+ Nova Demanda (DFD)")');
  await page.waitForURL(/\/dfd\/.+/);
  categoriaUrl ||= "";

  await page.fill('input[name="descricaoSumaria"]', `Homologação teste ${SUF}`);
  await page.selectOption('select[name="tipificacaoId"]', { index: 1 });
  await page.selectOption('select[name="prioridadeId"]', { index: 1 });
  await page.fill(
    'textarea[name="justificativa"]',
    "Justificativa de teste com mais de cem caracteres para passar na validação de tamanho mínimo exigida pelo formulário.",
  );
  await page.selectOption('select[name="tipoDemanda"]', "NOVA");
  await page.fill('input[name="data"]', "2077-06-01");
  await page.click('button:has-text("Salvar dados gerais")');
  await page.waitForSelector("text=Salvo.");

  await page.selectOption('select[name="enquadramento"]', enquadramento);
  await page.selectOption('select[name="categoriaId"]', { label: CATEGORIA });
  await page.selectOption('select[name="itemCatalogoId"]', { label: `${CATALOGO_ITEM} — R$ 1.000,00` });
  await page.fill('input[name="quantidade"]', String(quantidade));
  await page.fill('textarea[name="correlacao"]', "Correlação de teste para o item de homologação.");
  await page.click('button:has-text("Adicionar item ao DFD")');
  await page.waitForSelector(`text=${CATALOGO_ITEM}`);

  await page.click('button:has-text("Enviar para aprovação da PROAD")');
  await page.waitForURL(`${BASE}/`);
  await logout();
}

await passo("Unidade OP lança DFD com item OP (quantidade 3)", async () => {
  await lancarDfd(UNIDADE_OP_EMAIL, "OP", 3);
});

await passo("Unidade Geral lança DFD com item Geral (quantidade 4)", async () => {
  await lancarDfd(UNIDADE_GERAL_EMAIL, "GERAL", 4);
});

await passo("PROAD: aprova os 2 DFDs em lote", async () => {
  await loginProad();
  await page.waitForSelector(`text=Homologação teste ${SUF}`);
  // Aprovação em lote: aprovar individualmente muda a lista de pendentes a
  // cada clique (o DFD aprovado some da tabela), então um índice capturado
  // antes do loop fica obsoleto no segundo clique.
  const linhas = page.locator("tr", { hasText: `Homologação teste ${SUF}` });
  const total = await linhas.count();
  for (let i = 0; i < total; i++) {
    await linhas.nth(i).locator('input[type="checkbox"]').check();
  }
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Aprovar Selecionados em Lote")');
  await page.waitForTimeout(800);
  await page.reload();
  const aprovados = await page
    .locator("tr", { hasText: `Homologação teste ${SUF}` })
    .filter({ hasText: "Aprovado" })
    .count();
  if (aprovados < 2) throw new Error(`esperava 2 DFDs aprovados no histórico, contei ${aprovados}`);
  await logout();
});

/* ---------- setor técnico consolida os 2 itens ---------- */

await passo("Setor Técnico consolida os 2 itens pendentes", async () => {
  await loginPrimeiraVez(SETOR_EMAIL);
  await page.click(`tr:has-text("${CATEGORIA}") >> text=Abrir`);
  await page.waitForURL(/\/consolidacao\/.+/);
  categoriaUrl = page.url();

  const checkboxes = page.locator('input[type="checkbox"][name="itemDfdId"]');
  const total = await checkboxes.count();
  for (let i = 0; i < total; i++) await checkboxes.nth(i).check();

  await page.fill('input[name="processoSEI"]', PROCESSO_SEI);
  await page.fill('input[name="dataETP"]', "2077-01-01");
  await page.selectOption('select[name="prioridade"]', "ALTA");
  await page.selectOption('select[name="tipoContratacao"]', "NORMAL");
  await page.fill('input[name="dataEsperadaConclusao"]', "2077-03-10");
  await page.click('button:has-text("Consolidar Itens Selecionados")');
  await page.waitForSelector("text=Categoria consolidada com sucesso.");
  await logout();
});

/* ---------- Licitações: status, revisão, homologação parcial + manual ---------- */

let licitacaoUrl = "";
await passo("Licitações: primeiro acesso e abre a consolidação", async () => {
  await loginPrimeiraVez(LICITACOES_EMAIL);
  await page.waitForSelector(`text=${PROCESSO_SEI}`);
  await page.click(`tr:has-text("${PROCESSO_SEI}") >> text=Abrir`);
  await page.waitForURL(/\/licitacoes\/.+/);
  licitacaoUrl = page.url();
});

async function registrarStatus(status, campos = {}) {
  await page.selectOption('select[name="status"]', status);
  for (const [campo, valor] of Object.entries(campos)) {
    await page.fill(`[name="${campo}"]`, valor);
  }
  await page.click('button:has-text("Registrar Status")');
  await page.waitForSelector("text=Status registrado com sucesso.");
}

await passo("Licitações: pesquisa de preços -> termo de referência", async () => {
  await registrarStatus("PESQUISA_PRECOS", { responsavel: "Fulano da Silva" });
  await page.waitForSelector("text=Em Pesquisa de Preços");
  await registrarStatus("TERMO_REFERENCIA", { responsavel: "Fulano da Silva" });
  await page.waitForSelector("text=Em Elaboração de Termo de Referência");
});

await passo("Licitações: diligência ao demandante (intercorrência, testa repetição)", async () => {
  await registrarStatus("DILIGENCIA_DEMANDANTE", { dataDiligencia: "2077-01-10", prazoResposta: "2077-01-20" });
  await registrarStatus("DILIGENCIA_DEMANDANTE", { dataDiligencia: "2077-01-25", prazoResposta: "2077-02-01" });
  const ocorrencias = await page.locator("text=Em Diligência ao Demandante").count();
  if (ocorrencias < 2) throw new Error("intercorrência não se repetiu no histórico");
});

await passo("Licitações: segue para minutas, análise jurídica, sessão marcada, análise de propostas", async () => {
  await registrarStatus("MINUTAS", { responsavel: "Fulano da Silva" });
  await registrarStatus("ANALISE_JURIDICA");
  await registrarStatus("SESSAO_MARCADA", {
    dataSessao: "2077-02-15",
    agenteNome: "Ciclana Souza",
    agenteMatricula: "12345",
  });
  await registrarStatus("ANALISE_PROPOSTAS");
  await page.waitForSelector("text=Em Análise de Propostas");
});

await passo("Licitações: salva revisão de prioridade/prazo", async () => {
  await page.selectOption('select[name="prioridade"]', "MEDIA");
  await page.fill('input[name="dataEsperadaConclusao"]', "2077-04-01");
  await page.fill('textarea[name="justificativa"]', "Prazo revisado por atraso na fase interna.");
  await page.click('button:has-text("Salvar Revisão")');
  await page.waitForSelector("text=Revisão salva.");
  await page.waitForSelector("text=Prioridade revisada: Média");
});

await passo("Licitações: registra HOMOLOGADO, abre o quadro de resultados", async () => {
  await registrarStatus("HOMOLOGADO");
  await page.waitForSelector("text=Registrar Resultados da Homologação");
  await page.waitForSelector("text=7 unidade(s) pendente(s) · 3 OP");
});

await passo("homologação parcial com quantidade menor que o total OP aciona alocação manual", async () => {
  const painel = page.locator("div.rounded-lg.border", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_parcial");
  await painel.locator('input[name="quantidadeHomologada"]').fill("2");
  await painel.locator('input[name="valorUnitario"]').fill("1500");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=A quantidade homologada (2) não cobre todos os itens OP");
});

await passo("aloca manualmente 2 unidades para a linha OP e confirma", async () => {
  const painelManual = page.locator("div.border-amber-400");
  const linhaOP = painelManual.locator("tr", { hasText: "Unidade Homolog OP" });
  await linhaOP.locator('input[type="number"]').fill("2");
  await page.waitForSelector("text=Soma atual: 2 de 2");
  await page.click('button:has-text("Confirmar Alocação")');
  await page.waitForSelector("text=Alocação manual registrada.");
});

await passo("grupo restante mostra 5 unidades pendentes (1 OP + 4 Geral) e é resolvido com sucesso total", async () => {
  await page.waitForSelector("text=5 unidade(s) pendente(s) · 1 OP");
  const painel = page.locator("div.rounded-lg.border", { hasText: "Registrar Resultados da Homologação" });
  await painel.locator('select[name="resultado"]').selectOption("sucesso_total");
  await painel.locator('input[name="valorUnitario"]').fill("1600");
  await painel.locator('button:has-text("Registrar Resultado do Grupo")').click();
  await page.waitForSelector("text=Resultado registrado para o grupo.");
  await page.waitForSelector("text=Todos os itens deste processo já têm resultado registrado.");
});

await passo("Licitações: assinatura de contrato e encaminhamento para execução (contratação normal)", async () => {
  await registrarStatus("ASSINATURA_CONTRATO");
  await registrarStatus("REMETIDO_EXECUCAO");
  await page.waitForSelector("text=Processo concluído — não há próxima etapa disponível.");
  const formStatus = await page.locator('select[name="status"]').count();
  if (formStatus > 0) throw new Error("formulário de próximo status não deveria mais aparecer");
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
console.log("categoriaUrl:", categoriaUrl, "licitacaoUrl:", licitacaoUrl);

await browser.close();
