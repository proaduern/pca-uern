"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, gerarHashSenha } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export async function criarUnidadeAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const elegivelCotaOP = formData.get("elegivelCotaOP") === "on";
  const cotaOP = Number(formData.get("cotaOP") ?? 0);
  const cotaGeral = Number(formData.get("cotaGeral") ?? 0);
  const cotaTipo = (String(formData.get("cotaTipo") ?? "") || "FECHADA") as "FECHADA" | "ABERTA";
  const verCotaGeralPCA = formData.get("verCotaGeralPCA") === "on";
  const senhaInicial = String(formData.get("senhaInicial") ?? "");

  if (!nome || !email || !senhaInicial) {
    throw new Error("Preencha nome, email e senha inicial.");
  }
  if (!email.endsWith("@uern.br")) {
    throw new Error("O email da unidade precisa ser do domínio @uern.br.");
  }

  const senhaHash = await gerarHashSenha(senhaInicial);

  await prisma.unidade.create({
    data: {
      nome,
      email,
      senhaHash,
      senhaTemporaria: true,
      elegivelCotaOP,
      cotaOP,
      cotaGeral,
      cotaTipo,
      verCotaGeralPCA,
    },
  });

  revalidatePath("/admin/unidades");
}

export async function excluirUnidadeAction(unidadeId: string) {
  await exigirAdmin();
  const emUso = await prisma.dfd.count({ where: { unidadeId } });
  if (emUso > 0) {
    await prisma.unidade.update({ where: { id: unidadeId }, data: { ativa: false } });
  } else {
    await prisma.unidade.delete({ where: { id: unidadeId } });
  }
  revalidatePath("/admin/unidades");
}

export async function redefinirSenhaUnidadeAction(unidadeId: string, formData: FormData) {
  await exigirAdmin();
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const senhaHash = await gerarHashSenha(novaSenha);
  await prisma.unidade.update({
    where: { id: unidadeId },
    data: { senhaHash, senhaTemporaria: true },
  });
  revalidatePath("/admin/unidades");
}

// ---------------------------------------------------------------------------
// Setores técnicos
// ---------------------------------------------------------------------------

export async function criarSetorTecnicoAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senhaInicial = String(formData.get("senhaInicial") ?? "");

  if (!nome || !email || !senhaInicial) {
    throw new Error("Preencha nome, email e senha inicial.");
  }
  if (!email.endsWith("@uern.br")) {
    throw new Error("O email do setor técnico precisa ser do domínio @uern.br.");
  }

  const senhaHash = await gerarHashSenha(senhaInicial);

  await prisma.setorTecnico.create({
    data: { nome, email, senhaHash, senhaTemporaria: true },
  });

  revalidatePath("/admin/setores-tecnicos");
}

export async function excluirSetorTecnicoAction(setorTecnicoId: string) {
  await exigirAdmin();
  const emUso = await prisma.categoria.count({ where: { setorTecnicoId } });
  if (emUso > 0) {
    await prisma.setorTecnico.update({ where: { id: setorTecnicoId }, data: { ativo: false } });
  } else {
    await prisma.setorTecnico.delete({ where: { id: setorTecnicoId } });
  }
  revalidatePath("/admin/setores-tecnicos");
}

export async function redefinirSenhaSetorTecnicoAction(setorTecnicoId: string, formData: FormData) {
  await exigirAdmin();
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const senhaHash = await gerarHashSenha(novaSenha);
  await prisma.setorTecnico.update({
    where: { id: setorTecnicoId },
    data: { senhaHash, senhaTemporaria: true },
  });
  revalidatePath("/admin/setores-tecnicos");
}

export async function atribuirSetorTecnicoCategoriaAction(
  categoriaId: string,
  setorTecnicoId: string | null,
) {
  await exigirAdmin();
  await prisma.categoria.update({ where: { id: categoriaId }, data: { setorTecnicoId } });
  revalidatePath("/admin/categorias");
}

// ---------------------------------------------------------------------------
// PCA
// ---------------------------------------------------------------------------

export async function criarOuAtualizarPcaAction(formData: FormData) {
  await exigirAdmin();
  const ano = Number(formData.get("ano"));
  const cotaGeral = Number(formData.get("cotaGeral") ?? 0);
  const cotaOP = Number(formData.get("cotaOP") ?? 0);
  const dataAbertura = String(formData.get("dataAbertura") ?? "");
  const dataFechamento = String(formData.get("dataFechamento") ?? "");

  if (!ano || !dataAbertura || !dataFechamento) {
    throw new Error("Preencha ano, data de abertura e data de fechamento.");
  }
  if (cotaOP > cotaGeral) {
    throw new Error("A cota OP não pode ser maior que a cota geral do PCA.");
  }

  await prisma.pca.upsert({
    where: { ano },
    update: { cotaGeral, cotaOP, dataAbertura: new Date(dataAbertura), dataFechamento: new Date(dataFechamento) },
    create: {
      ano,
      cotaGeral,
      cotaOP,
      dataAbertura: new Date(dataAbertura),
      dataFechamento: new Date(dataFechamento),
    },
  });

  revalidatePath("/admin/pca");
}

export async function ativarPcaAction(ano: number) {
  await exigirAdmin();
  await prisma.$transaction([
    prisma.pca.updateMany({ data: { ativo: false }, where: { ativo: true } }),
    prisma.pca.update({ where: { ano }, data: { ativo: true } }),
  ]);
  revalidatePath("/admin/pca");
}

export async function toggleAberturaExtraAction(ano: number, ligado: boolean) {
  await exigirAdmin();
  await prisma.pca.update({ where: { ano }, data: { aberturaExtraGeral: ligado } });
  revalidatePath("/admin/pca");
}

export async function toggleConcluidoAction(ano: number, concluido: boolean) {
  await exigirAdmin();
  await prisma.pca.update({ where: { ano }, data: { concluido } });
  revalidatePath("/admin/pca");
}

export async function adicionarExcecaoPcaAction(formData: FormData) {
  await exigirAdmin();
  const ano = Number(formData.get("ano"));
  const unidadeId = String(formData.get("unidadeId") ?? "");
  if (!ano || !unidadeId) throw new Error("Selecione o PCA e a unidade.");
  await prisma.pcaExcecao.upsert({
    where: { pcaAno_unidadeId: { pcaAno: ano, unidadeId } },
    update: {},
    create: { pcaAno: ano, unidadeId },
  });
  revalidatePath("/admin/pca");
}

export async function removerExcecaoPcaAction(id: string) {
  await exigirAdmin();
  await prisma.pcaExcecao.delete({ where: { id } });
  revalidatePath("/admin/pca");
}

// ---------------------------------------------------------------------------
// Categorias e catálogo
// ---------------------------------------------------------------------------

export async function criarCategoriaAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = (String(formData.get("tipo") ?? "") || "MATERIAL") as "MATERIAL" | "SERVICO";
  const semItem = formData.get("semItem") === "on";
  const modoServico = (String(formData.get("modoServico") ?? "") || "OBJETO") as
    | "OBJETO"
    | "VALOR"
    | "ITENS";
  const fluxoContinuo = formData.get("fluxoContinuo") === "on";
  const dependeContrato = formData.get("dependeContrato") === "on";
  const ignoraPCA = formData.get("ignoraPCA") === "on";
  const saldoAnualGlobalRaw = String(formData.get("saldoAnualGlobal") ?? "").trim();
  const saldoAnualGlobal = saldoAnualGlobalRaw ? Number(saldoAnualGlobalRaw) : null;

  if (!nome) throw new Error("Informe o nome da categoria.");

  await prisma.categoria.create({
    data: {
      nome,
      tipo,
      semItem,
      modoServico,
      fluxoContinuo,
      dependeContrato,
      ignoraPCA,
      saldoAnualGlobal,
    },
  });

  revalidatePath("/admin/categorias");
}

export async function excluirCategoriaAction(categoriaId: string) {
  await exigirAdmin();
  const emUso = await prisma.itemDfd.count({ where: { categoriaId } });
  if (emUso > 0) {
    throw new Error("Esta categoria está em uso em algum DFD e não pode ser excluída.");
  }
  await prisma.categoria.delete({ where: { id: categoriaId } });
  revalidatePath("/admin/categorias");
}

export async function criarItemCatalogoAction(formData: FormData) {
  await exigirAdmin();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const item = String(formData.get("item") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const tipoBem = (String(formData.get("tipoBem") ?? "") || "PERMANENTE") as
    | "CONSUMO"
    | "PERMANENTE";

  if (!categoriaId || !item || !(valor > 0)) {
    throw new Error("Preencha categoria, nome do item e um valor maior que zero.");
  }

  await prisma.itemCatalogo.create({ data: { categoriaId, item, valor, tipoBem } });
  revalidatePath("/admin/catalogo");
}

export async function excluirItemCatalogoAction(itemId: string) {
  await exigirAdmin();
  await prisma.itemCatalogo.delete({ where: { id: itemId } });
  revalidatePath("/admin/catalogo");
}

// ---------------------------------------------------------------------------
// Tipificações e prioridades
// ---------------------------------------------------------------------------

export async function criarTipificacaoAction(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome da tipificação.");
  await prisma.tipificacao.create({ data: { nome } });
  revalidatePath("/admin/parametros");
}

export async function excluirTipificacaoAction(id: string) {
  await exigirAdmin();
  await prisma.tipificacao.delete({ where: { id } });
  revalidatePath("/admin/parametros");
}

export async function criarPrioridadeAction(formData: FormData) {
  await exigirAdmin();
  const frase = String(formData.get("frase") ?? "").trim();
  const nivel = String(formData.get("nivel") ?? "MEDIA") as
    | "ALTISSIMA"
    | "ALTA"
    | "MEDIA"
    | "BAIXA";
  if (!frase) throw new Error("Informe a frase de prioridade.");
  await prisma.prioridade.create({ data: { frase, nivel } });
  revalidatePath("/admin/parametros");
}

export async function excluirPrioridadeAction(id: string) {
  await exigirAdmin();
  await prisma.prioridade.delete({ where: { id } });
  revalidatePath("/admin/parametros");
}

// ---------------------------------------------------------------------------
// Aprovação de DFD
// ---------------------------------------------------------------------------

export async function aprovarDfdAction(dfdId: string) {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  if (dfd.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este DFD não está aguardando aprovação.");
  }
  await prisma.dfd.update({
    where: { id: dfdId },
    data: { status: "APROVADO", aprovadoEm: new Date(), reprovadoEm: null, motivoReprovacao: null },
  });
  revalidatePath("/");
}

export async function reprovarDfdAction(dfdId: string, formData: FormData) {
  await exigirAdmin();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Informe o motivo da reprovação.");
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  if (dfd.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este DFD não está aguardando aprovação.");
  }
  await prisma.dfd.update({
    where: { id: dfdId },
    data: { status: "REPROVADO", reprovadoEm: new Date(), motivoReprovacao: motivo },
  });
  revalidatePath("/");
}

export async function desfazerAprovacaoDfdAction(dfdId: string) {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  if (dfd.status !== "APROVADO") {
    throw new Error("Este DFD não está aprovado no momento.");
  }
  await prisma.dfd.update({
    where: { id: dfdId },
    data: { status: "AGUARDANDO_APROVACAO", aprovadoEm: null },
  });
  revalidatePath("/");
}
