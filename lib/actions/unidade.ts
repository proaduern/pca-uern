"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirUnidade } from "@/lib/auth";

/** Autoatendimento: a própria unidade cadastra/edita o responsável por ela
 * (nome completo, matrícula, telefone) — a PROAD também pode fazer isso via
 * edição em /admin/unidades. */
export async function atualizarResponsavelUnidadeAction(formData: FormData) {
  const sessao = await exigirUnidade();
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || null;
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;
  const responsavelTelefone = String(formData.get("responsavelTelefone") ?? "").trim() || null;

  await prisma.unidade.update({
    where: { id: sessao.id },
    data: { responsavelNome, responsavelMatricula, responsavelTelefone },
  });

  revalidatePath("/dados-unidade");
}
