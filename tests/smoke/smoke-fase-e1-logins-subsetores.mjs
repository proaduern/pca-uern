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
const sufixo = Date.now();
const licEmail = `smoke.e1.licitacoes.${sufixo}@uern.br`;
const planejamentoEmail = `smoke.e1.planejamento.${sufixo}@uern.br`;
const licNome = `Diretoria Smoke E1 ${sufixo}`;
const ppNome = `Fulana Pesquisa ${sufixo}`;
const planejamentoNome = `Beltrano Planejamento ${sufixo}`;
const acNome = `Ciclano Agente ${sufixo}`;

async function loginProad() {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

await passo("login PROAD", loginProad);

await passo("criar acesso próprio de Licitações", async () => {
  await page.goto(`${BASE}/admin/licitacoes`);
  await page.fill('form:has(h2:text("Novo acesso")) input[name="nome"]', licNome);
  await page.fill('form:has(h2:text("Novo acesso")) input[name="email"]', licEmail);
  await page.fill('form:has(h2:text("Novo acesso")) input[name="senhaInicial"]', "senha12345");
  await page.click('form:has(h2:text("Novo acesso")) button:has-text("Salvar")');
  await page.waitForSelector(`text=${licEmail}`);
});

await passo("criar Pesquisa de Preços vinculada à Licitações recém-criada", async () => {
  await page.goto(`${BASE}/admin/pesquisa-precos`);
  const form = page.locator('form:has(h2:text("Novo acesso"))');
  await form.locator('input[name="nome"]').fill(ppNome);
  await form.locator('input[name="matricula"]').fill("PP-001");
  await form.locator('input[name="funcao"]').fill("Servidora de Pesquisa de Preços");
  await form.locator('input[name="vinculado"]').check();
  await form.locator('select[name="licitacoesId"]').selectOption({ label: `${licNome} (${licEmail})` });
  await form.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${ppNome}`);
  await page.waitForSelector(`text=vinculado a ${licNome}`);
});

await passo("criar Planejamento com login próprio (não vinculado)", async () => {
  await page.goto(`${BASE}/admin/planejamento`);
  const form = page.locator('form:has(h2:text("Novo acesso"))');
  await form.locator('input[name="nome"]').fill(planejamentoNome);
  await form.locator('input[name="matricula"]').fill("PL-001");
  await form.locator('input[name="funcao"]').fill("Servidor de Planejamento");
  await form.locator('input[name="email"]').fill(planejamentoEmail);
  await form.locator('input[name="senhaInicial"]').fill("senha12345");
  await form.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${planejamentoNome}`);
});

await passo("criar Agente de Contratação vinculado à Licitações", async () => {
  await page.goto(`${BASE}/admin/agentes-contratacao`);
  const form = page.locator('form:has(h2:text("Novo acesso"))');
  await form.locator('input[name="nome"]').fill(acNome);
  await form.locator('input[name="matricula"]').fill("AC-001");
  await form.locator('input[name="funcao"]').fill("Agente de Contratação");
  await form.locator('input[name="vinculado"]').check();
  await form.locator('select[name="licitacoesId"]').selectOption({ label: `${licNome} (${licEmail})` });
  await form.locator('button:has-text("Salvar")').click();
  await page.waitForSelector(`text=${acNome}`);
  await page.waitForSelector(`text=vinculado a ${licNome}`);
});

async function loginLicitacoes(senha) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', licEmail);
  await page.fill('input[name="senha"]', senha);
  await page.click('button[type="submit"]');
}

await passo("login com o email de Licitações oferece escolha de perfil (Licitações + Pesquisa de Preços + Agente de Contratação, sem Planejamento)", async () => {
  await loginLicitacoes("senha12345");
  await page.waitForSelector("text=Escolha o perfil");
  await page.waitForSelector(`button:has-text("${licNome}")`);
  await page.waitForSelector(`button:has-text("${ppNome}")`);
  await page.waitForSelector(`button:has-text("${acNome}")`);
  const opcaoPlanejamento = await page.locator(`button:has-text("${planejamentoNome}")`).count();
  if (opcaoPlanejamento !== 0) throw new Error("Planejamento (não vinculado) não deveria aparecer nas opções de perfil de Licitações");
});

await passo("escolher perfil Pesquisa de Preços, trocar senha temporária e ver a home do subsetor", async () => {
  await page.click(`button:has-text("${ppNome}")`);
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Pesquisa de Preços");
  await page.waitForSelector(`text=${ppNome}`);
  await page.waitForSelector("text=matrícula PP-001");
});

await passo("login novamente com Licitações (senha já trocada via vínculo) escolhe Agente de Contratação direto, sem pedir trocar senha", async () => {
  await loginLicitacoes("novaSenha123");
  await page.waitForSelector("text=Escolha o perfil");
  await page.click(`button:has-text("${acNome}")`);
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Agente de Contratação");
  await page.waitForSelector(`text=${acNome}`);
  await page.waitForSelector("text=matrícula AC-001");
});

await passo("escolher perfil Licitações mostra o painel de processos consolidados", async () => {
  await loginLicitacoes("novaSenha123");
  await page.waitForSelector("text=Escolha o perfil");
  await page.click(`button:has-text("${licNome}")`);
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Processos Consolidados pelos Setores Técnicos");
});

await passo("login direto com o Planejamento (login próprio, sem escolha de perfil)", async () => {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', planejamentoEmail);
  await page.fill('input[name="senha"]', "senha12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/trocar-senha`);
  await page.fill('input[name="novaSenha"]', "novaSenha123");
  await page.fill('input[name="confirmacao"]', "novaSenha123");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Planejamento");
  await page.waitForSelector(`text=${planejamentoNome}`);
});

await passo("PROAD: Atuar Como o Planejamento a partir do admin", async () => {
  await loginProad();
  await page.goto(`${BASE}/admin/planejamento`);
  const linha = page.locator("tr", { hasText: planejamentoNome });
  await linha.locator('button:has-text("Atuar Como")').click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector("text=Atuando como:");
  await page.waitForSelector(`text=${planejamentoNome}`);
});

await passo("PROAD: volta para admin a partir do banner de impersonação", async () => {
  await page.click('button:has-text("Voltar para Admin")');
  await page.waitForSelector("text=Atuando como:", { state: "hidden" });
  await page.waitForSelector("text=Aprovação de DFDs");
});

await passo("PROAD exclui o Agente de Contratação e ele some da lista e das opções de perfil", async () => {
  await page.goto(`${BASE}/admin/agentes-contratacao`);
  const linha = page.locator("tr", { hasText: acNome });
  page.once("dialog", (d) => d.accept());
  await linha.locator('button:has-text("Excluir")').click();
  await page.waitForSelector(`text=${acNome}`, { state: "hidden" });

  await loginLicitacoes("novaSenha123");
  await page.waitForSelector("text=Escolha o perfil");
  await page.waitForSelector(`button:has-text("${licNome}")`);
  await page.waitForSelector(`button:has-text("${ppNome}")`);
  const opcaoAgente = await page.locator(`button:has-text("${acNome}")`).count();
  if (opcaoAgente !== 0) throw new Error("Agente de Contratação excluído não deveria mais aparecer nas opções de perfil");
});

console.log("--- erros de página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");
if (erros.length) process.exitCode = 1;

await browser.close();
