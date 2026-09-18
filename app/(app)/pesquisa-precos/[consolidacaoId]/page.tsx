import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import IniciarPesquisaPrecosForm from "./IniciarPesquisaPrecosForm";
import PesquisaPrecosForm from "./PesquisaPrecosForm";

export default async function PesquisaPrecosDetalhePage({
  params,
}: {
  params: Promise<{ consolidacaoId: string }>;
}) {
  const { consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.tipo !== "PESQUISA_PRECOS" && sessao.tipo !== "ADMIN") redirect("/");

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      setorTecnico: true,
      pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
    },
  });
  if (!consolidacao) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Pesquisa de Preços — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">
          Processo SEI: {consolidacao.processoSEI} · Setor Técnico: {consolidacao.setorTecnico.nome}
        </p>
      </div>

      {!consolidacao.pesquisaDePrecos ? (
        <IniciarPesquisaPrecosForm consolidacaoTecnicaId={consolidacaoId} />
      ) : (
        <PesquisaPrecosForm
          pdfHref={`/pesquisa-precos/${consolidacaoId}/pdf`}
          pesquisa={{
            id: consolidacao.pesquisaDePrecos.id,
            metodologia: consolidacao.pesquisaDePrecos.metodologia,
            arquivoPdfNome: consolidacao.pesquisaDePrecos.arquivoPdfNome,
            arquivoPdfTexto: consolidacao.pesquisaDePrecos.arquivoPdfTexto,
            status: consolidacao.pesquisaDePrecos.status,
            responsavelNome: consolidacao.pesquisaDePrecos.responsavelNome,
            responsavelMatricula: consolidacao.pesquisaDePrecos.responsavelMatricula,
            itens: consolidacao.pesquisaDePrecos.itens.map((it) => ({
              item: it.item,
              quantidade: Number(it.quantidade),
              valorUnitarioPesquisado: Number(it.valorUnitarioPesquisado),
              medianaPesquisada: it.medianaPesquisada === null ? null : Number(it.medianaPesquisada),
              fontesConsultadas: it.fontesConsultadas,
            })),
          }}
        />
      )}
    </div>
  );
}
