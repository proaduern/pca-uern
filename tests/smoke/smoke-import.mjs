import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

function arquivoTemp(nome, conteudo) {
  const p = path.join(os.tmpdir(), nome);
  fs.writeFileSync(p, conteudo, "utf-8");
  return p;
}

const BASE = "http://localhost:3001";

await passo("login como PROAD", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "adj.proad@uern.br");
  await page.fill('input[name="senha"]', "TrocarEssaSenha123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
});

await passo("importar categorias com 1 linha valida e 1 invalida", async () => {
  const csv = arquivoTemp(
    "categorias.csv",
    "nome,tipo,modoServico,semItem,fluxoContinuo,dependeContrato,ignoraPCA,saldoAnualGlobal\n" +
      "Material de TI,MATERIAL,,nao,nao,nao,nao,\n" +
      ",MATERIAL,,nao,nao,nao,nao,\n",
  );
  await page.goto(`${BASE}/admin/categorias`);
  await page.click('summary:has-text("Importar categorias em lote")');
  await page.setInputFiles('input[name="arquivo"]', csv);
  await page.click('button:has-text("Importar")');
  await page.waitForSelector("text=1 registro(s) importado(s)");
  await page.waitForSelector("text=1 linha(s) com erro");
  await page.waitForSelector("text=Material de TI");
});

await passo("importar unidades com 1 linha valida e 1 invalida (dominio errado)", async () => {
  const csv = arquivoTemp(
    "unidades.csv",
    "nome,email,senhaInicial,elegivelCotaOP,cotaOP,cotaGeral,cotaTipo,verCotaGeralPCA\n" +
      "Depto Importado,depto.import@uern.br,SenhaProvisoria123,sim,10000,20000,FECHADA,nao\n" +
      "Depto Invalido,depto.invalido@gmail.com,SenhaProvisoria123,nao,0,0,FECHADA,nao\n",
  );
  await page.goto(`${BASE}/admin/unidades`);
  await page.click('summary:has-text("Importar unidades em lote")');
  await page.setInputFiles('input[name="arquivo"]', csv);
  await page.click('button:has-text("Importar")');
  await page.waitForSelector("text=1 registro(s) importado(s)");
  await page.waitForSelector("text=1 linha(s) com erro");
  await page.waitForSelector("text=depto.import@uern.br");
});

await passo("importar itens de catalogo com formato brasileiro de valor (virgula)", async () => {
  const csv = arquivoTemp(
    "catalogo.csv",
    "categoria;item;valor;tipoBem\n" +
      "Material de TI;Mouse sem fio;89,90;PERMANENTE\n" +
      "Categoria Inexistente;Item Fantasma;10,00;PERMANENTE\n",
  );
  await page.goto(`${BASE}/admin/catalogo`);
  await page.click('summary:has-text("Importar itens de catálogo em lote")');
  await page.setInputFiles('input[name="arquivo"]', csv);
  await page.click('button:has-text("Importar")');
  await page.waitForSelector("text=1 registro(s) importado(s)");
  await page.waitForSelector("text=1 linha(s) com erro");
  await page.waitForSelector("text=R$ 89,90");
});

console.log("--- erros de console/página capturados ---");
console.log(erros.length ? erros.join("\n") : "(nenhum)");

await browser.close();
