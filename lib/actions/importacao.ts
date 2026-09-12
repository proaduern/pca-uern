"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, gerarHashSenha } from "@/lib/auth";
import { lerPlanilha, paraBooleano, paraNumero, type ResultadoImportacao } from "@/lib/importacao";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

async function obterLinhas(formData: FormData) {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo de planilha (.xlsx, .xls ou .csv).");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 5 MB.");
  }
  const buffer = await arquivo.arrayBuffer();
  const linhas = await lerPlanilha(arquivo.name, buffer);
  if (linhas.length === 0) throw new Error("A planilha está vazia.");
  return linhas;
}

function mensagemDeErro(e: unknown, duplicidade: string): string {
  const mensagem = e instanceof Error ? e.message : "erro desconhecido.";
  return mensagem.includes("Unique constraint") ? duplicidade : mensagem;
}

export async function importarUnidadesAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  for (const { linha, dados } of linhas) {
    try {
      const nome = (dados.nome ?? "").trim();
      const email = (dados.email ?? "").trim().toLowerCase();
      const senhaInicial = (dados.senhaInicial ?? "").trim();
      if (!nome || !email || !senhaInicial) {
        throw new Error("preencha nome, email e senhaInicial.");
      }
      if (!email.endsWith("@uern.br")) {
        throw new Error("o email precisa ser do domínio @uern.br.");
      }
      const senhaHash = await gerarHashSenha(senhaInicial);
      const cotaTipo = (dados.cotaTipo?.trim().toUpperCase() || "FECHADA") as "FECHADA" | "ABERTA";
      if (!["FECHADA", "ABERTA"].includes(cotaTipo)) {
        throw new Error('cotaTipo precisa ser "FECHADA" ou "ABERTA".');
      }
      await prisma.unidade.create({
        data: {
          nome,
          email,
          senhaHash,
          senhaTemporaria: true,
          elegivelCotaOP: paraBooleano(dados.elegivelCotaOP),
          cotaOP: paraNumero(dados.cotaOP),
          cotaGeral: paraNumero(dados.cotaGeral),
          cotaTipo,
          verCotaGeralPCA: paraBooleano(dados.verCotaGeralPCA),
        },
      });
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: mensagemDeErro(e, "já existe uma unidade com este email.") });
    }
  }

  revalidatePath("/admin/unidades");
  return { sucesso, erros };
}

export async function importarCategoriasAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  for (const { linha, dados } of linhas) {
    try {
      const nome = (dados.nome ?? "").trim();
      if (!nome) throw new Error("preencha o nome.");
      const tipo = (dados.tipo?.trim().toUpperCase() || "MATERIAL") as "MATERIAL" | "SERVICO";
      if (!["MATERIAL", "SERVICO"].includes(tipo)) {
        throw new Error('tipo precisa ser "MATERIAL" ou "SERVICO".');
      }
      const modoServico = (dados.modoServico?.trim().toUpperCase() || "OBJETO") as
        | "OBJETO"
        | "VALOR"
        | "ITENS";
      if (!["OBJETO", "VALOR", "ITENS"].includes(modoServico)) {
        throw new Error('modoServico precisa ser "OBJETO", "VALOR" ou "ITENS".');
      }
      const saldoAnualGlobalTexto = (dados.saldoAnualGlobal ?? "").trim();
      await prisma.categoria.create({
        data: {
          nome,
          tipo,
          modoServico,
          semItem: paraBooleano(dados.semItem),
          fluxoContinuo: paraBooleano(dados.fluxoContinuo),
          dependeContrato: paraBooleano(dados.dependeContrato),
          ignoraPCA: paraBooleano(dados.ignoraPCA),
          saldoAnualGlobal: saldoAnualGlobalTexto ? paraNumero(saldoAnualGlobalTexto) : null,
        },
      });
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: mensagemDeErro(e, "já existe uma categoria com este nome.") });
    }
  }

  revalidatePath("/admin/categorias");
  return { sucesso, erros };
}

export async function importarItensCatalogoAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const categorias = await prisma.categoria.findMany({ where: { semItem: false } });
  const mapaCategorias = new Map(categorias.map((c) => [c.nome.trim().toLowerCase(), c.id]));
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  for (const { linha, dados } of linhas) {
    try {
      const nomeCategoria = (dados.categoria ?? "").trim();
      const categoriaId = mapaCategorias.get(nomeCategoria.toLowerCase());
      if (!categoriaId) {
        throw new Error(`categoria "${nomeCategoria}" não encontrada (ou é uma categoria "sem catálogo").`);
      }
      const item = (dados.item ?? "").trim();
      const valor = paraNumero(dados.valor);
      if (!item) throw new Error("preencha o nome do item.");
      if (!(valor > 0)) throw new Error("o valor precisa ser maior que zero.");
      const tipoBem = (dados.tipoBem?.trim().toUpperCase() || "PERMANENTE") as "CONSUMO" | "PERMANENTE";
      if (!["CONSUMO", "PERMANENTE"].includes(tipoBem)) {
        throw new Error('tipoBem precisa ser "CONSUMO" ou "PERMANENTE".');
      }
      await prisma.itemCatalogo.create({ data: { categoriaId, item, valor, tipoBem } });
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: mensagemDeErro(e, "erro ao gravar o item.") });
    }
  }

  revalidatePath("/admin/catalogo");
  return { sucesso, erros };
}
