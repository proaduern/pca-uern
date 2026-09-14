"use server";

import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { definirPcaEmAtuacao, pcasAtivos } from "@/lib/pca-contexto";

export async function selecionarPcaAtuacaoAction(ano: number) {
  const sessao = await obterSessao();
  if (!sessao || (sessao.tipo !== "UNIDADE" && sessao.tipo !== "SETOR_TECNICO")) {
    throw new Error("Sessão inválida para selecionar PCA.");
  }

  const ativos = await pcasAtivos();
  if (!ativos.some((p) => p.ano === ano)) {
    throw new Error("Este PCA não está mais ativo. Atualize a página e escolha novamente.");
  }

  await definirPcaEmAtuacao(sessao, ano);
  redirect("/");
}
