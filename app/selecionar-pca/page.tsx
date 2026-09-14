import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { pcasAtivos } from "@/lib/pca-contexto";
import { janelaAberta } from "@/lib/cota";
import { formatarData } from "@/lib/formato";
import SelecionarPcaForm from "./SelecionarPcaForm";

export default async function SelecionarPcaPage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.tipo !== "UNIDADE" && sessao.tipo !== "SETOR_TECNICO") redirect("/");

  const ativos = await pcasAtivos();
  if (ativos.length < 2) redirect("/");

  const excecoes =
    sessao.tipo === "UNIDADE"
      ? await prisma.pcaExcecao.findMany({ where: { unidadeId: sessao.id, pcaAno: { in: ativos.map((p) => p.ano) } } })
      : [];
  const anosComExcecao = new Set(excecoes.map((e) => e.pcaAno));

  const opcoes = ativos.map((pca) => ({
    ano: pca.ano,
    janela: `${formatarData(pca.dataAbertura)} a ${formatarData(pca.dataFechamento)}`,
    abertoParaLancamento: janelaAberta(pca, anosComExcecao.has(pca.ano), new Date()),
  }));

  return <SelecionarPcaForm opcoes={opcoes} />;
}
