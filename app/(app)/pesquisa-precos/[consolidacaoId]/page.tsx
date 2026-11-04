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
  if (
    sessao.tipo !== "PESQUISA_PRECOS" &&
    sessao.tipo !== "ADMIN" &&
    sessao.tipo !== "LICITACOES" &&
    sessao.tipo !== "AGENTE_CONTRATACAO"
  ) {
    redirect("/");
  }

  let consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      setorTecnico: true,
      agenteContratacaoDesignado: true,
      pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
      itensDfd: true,
      itensTecnicos: true,
    },
  });
  if (!consolidacao) notFound();

  // Inicializa automaticamente a Pesquisa de Preços com os itens consolidados se ainda não existir
  if (!consolidacao.pesquisaDePrecos) {
    const mapa = new Map<string, number>();
    for (const it of consolidacao.itensDfd) {
      const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)").trim();
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(it.quantidade ?? 1));
    }
    for (const it of consolidacao.itensTecnicos) {
      const nome = it.item.trim();
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(it.quantidade ?? 1));
    }

    if (mapa.size > 0) {
      await prisma.pesquisaDePrecos.create({
        data: {
          consolidacaoTecnicaId: consolidacaoId,
          metodologia:
            "Pesquisa de preços realizada em conformidade com o art. 23 da Lei nº 14.133/2021 e IN SEGES/ME nº 65/2021, utilizando o Sistema Banco de Preços.",
          itens: {
            create: [...mapa.entries()].map(([item, quantidade], ordem) => ({
              ordem,
              item,
              quantidade,
              fontesConsultadas: "Sistema Banco de Preços",
            })),
          },
        },
      });

      consolidacao = await prisma.consolidacaoTecnica.findUnique({
        where: { id: consolidacaoId },
        include: {
          categoria: true,
          setorTecnico: true,
          agenteContratacaoDesignado: true,
          pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
          itensDfd: true,
          itensTecnicos: true,
        },
      });
    }
  }

  if (!consolidacao) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Pesquisa de Preços — {consolidacao.categoria.nome}
          </h1>
          <p className="text-sm text-slate-500">
            Processo SEI: {consolidacao.processoSEI} · Setor Técnico: {consolidacao.setorTecnico.nome}
            {consolidacao.agenteContratacaoDesignado && (
              <> · Agente de Contratação: {consolidacao.agenteContratacaoDesignado.nome}</>
            )}
          </p>
        </div>
      </div>

      {!consolidacao.pesquisaDePrecos ? (
        <IniciarPesquisaPrecosForm consolidacaoTecnicaId={consolidacaoId} />
      ) : (
        <PesquisaPrecosForm
          consolidacaoId={consolidacaoId}
          exportXlsxHref={`/pesquisa-precos/${consolidacaoId}/banco-precos-modelo-xlsx`}
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
