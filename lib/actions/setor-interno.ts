"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirUnidade, gerarHashSenha } from "@/lib/auth";
import type { ResultadoAcao } from "./tipos";

const SENHA_PADRAO_INICIAL = "123";

/**
 * A soma das fatias (cotaOP/cotaGeral) de todos os setores internos ativos
 * de uma unidade nunca pode passar da própria cota da unidade — senão a
 * trava por setor (ver lib/actions/dfd.ts) não significaria nada.
 */
async function validarSomaCotaSetores(opts: {
  unidadeId: string;
  cotaOP: number;
  cotaGeral: number;
  excludeSetorInternoId: string | null;
}): Promise<string | null> {
  const { unidadeId, cotaOP, cotaGeral, excludeSetorInternoId } = opts;
  const [unidade, setores] = await Promise.all([
    prisma.unidade.findUniqueOrThrow({ where: { id: unidadeId } }),
    prisma.setorInterno.findMany({
      where: { unidadeId, ativo: true, id: { not: excludeSetorInternoId ?? undefined } },
      select: { cotaOP: true, cotaGeral: true },
    }),
  ]);

  const somaOP = setores.reduce((s, x) => s + Number(x.cotaOP), cotaOP);
  const somaGeral = setores.reduce((s, x) => s + Number(x.cotaGeral), cotaGeral);

  if (somaOP > Number(unidade.cotaOP)) {
    return `A soma da cota OP dos setores internos (${somaOP.toFixed(2)}) excederia a cota OP da unidade (${Number(unidade.cotaOP).toFixed(2)}).`;
  }
  if (somaGeral > Number(unidade.cotaGeral)) {
    return `A soma da cota Geral dos setores internos (${somaGeral.toFixed(2)}) excederia a cota Geral da unidade (${Number(unidade.cotaGeral).toFixed(2)}).`;
  }
  return null;
}

export async function criarSetorInternoAction(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cotaOP = Number(formData.get("cotaOP") ?? 0);
  const cotaGeral = Number(formData.get("cotaGeral") ?? 0);

  if (!nome || !email) return { erro: "Preencha nome e email do setor interno." };
  if (!email.endsWith("@uern.br")) return { erro: "O email precisa ser do domínio @uern.br." };

  const erroCota = await validarSomaCotaSetores({
    unidadeId: sessao.id,
    cotaOP,
    cotaGeral,
    excludeSetorInternoId: null,
  });
  if (erroCota) return { erro: erroCota };

  const senhaHash = await gerarHashSenha(SENHA_PADRAO_INICIAL);

  try {
    await prisma.setorInterno.create({
      data: { unidadeId: sessao.id, nome, email, senhaHash, senhaTemporaria: true, cotaOP, cotaGeral },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um setor interno (ou outro login) cadastrado com este e-mail." };
    }
    throw erro;
  }

  revalidatePath("/dados-unidade");
  return {};
}

async function obterSetorInternoDaUnidade(
  setorInternoId: string,
  unidadeId: string,
): Promise<{ erro: string } | { setor: { id: string } }> {
  const setor = await prisma.setorInterno.findUnique({ where: { id: setorInternoId } });
  if (!setor || setor.unidadeId !== unidadeId) return { erro: "Setor interno não encontrado." };
  return { setor };
}

export async function atualizarSetorInternoAction(
  setorInternoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoSetor = await obterSetorInternoDaUnidade(setorInternoId, sessao.id);
  if ("erro" in resultadoSetor) return { erro: resultadoSetor.erro };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cotaOP = Number(formData.get("cotaOP") ?? 0);
  const cotaGeral = Number(formData.get("cotaGeral") ?? 0);
  const ativo = formData.get("ativo") === "on";

  if (!nome || !email) return { erro: "Preencha nome e email do setor interno." };
  if (!email.endsWith("@uern.br")) return { erro: "O email precisa ser do domínio @uern.br." };

  if (ativo) {
    const erroCota = await validarSomaCotaSetores({
      unidadeId: sessao.id,
      cotaOP,
      cotaGeral,
      excludeSetorInternoId: setorInternoId,
    });
    if (erroCota) return { erro: erroCota };
  }

  try {
    await prisma.setorInterno.update({
      where: { id: setorInternoId },
      data: { nome, email, cotaOP, cotaGeral, ativo },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um setor interno (ou outro login) cadastrado com este e-mail." };
    }
    throw erro;
  }

  revalidatePath("/dados-unidade");
  return {};
}

export async function redefinirSenhaSetorInternoAction(
  setorInternoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoSetor = await obterSetorInternoDaUnidade(setorInternoId, sessao.id);
  if ("erro" in resultadoSetor) return { erro: resultadoSetor.erro };
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (novaSenha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  const senhaHash = await gerarHashSenha(novaSenha);
  await prisma.setorInterno.update({
    where: { id: setorInternoId },
    data: { senhaHash, senhaTemporaria: true },
  });
  revalidatePath("/dados-unidade");
  return {};
}

export async function excluirSetorInternoAction(setorInternoId: string): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoSetor = await obterSetorInternoDaUnidade(setorInternoId, sessao.id);
  if ("erro" in resultadoSetor) return { erro: resultadoSetor.erro };
  const emUso = await prisma.dfd.count({ where: { setorInternoId } });
  if (emUso > 0) {
    await prisma.setorInterno.update({ where: { id: setorInternoId }, data: { ativo: false } });
  } else {
    await prisma.setorInterno.delete({ where: { id: setorInternoId } });
  }
  revalidatePath("/dados-unidade");
  return {};
}
