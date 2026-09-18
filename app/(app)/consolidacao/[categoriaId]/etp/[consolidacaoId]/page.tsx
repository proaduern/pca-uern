import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { brl } from "@/lib/formato";
import EtpForm from "./EtpForm";
import IniciarDocumentoBotao from "../../../../IniciarDocumentoBotao";
import { criarEtpAction } from "@/lib/actions/etp-riscos";

export default async function EtpPage({
  params,
}: {
  params: Promise<{ categoriaId: string; consolidacaoId: string }>;
}) {
  const { categoriaId, consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao || sessao.tipo !== "SETOR_TECNICO") return null;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      itensDfd: { include: { categoria: true } },
      itensTecnicos: true,
      estudoTecnicoPreliminar: true,
    },
  });
  if (!consolidacao || consolidacao.categoriaId !== categoriaId || consolidacao.setorTecnicoId !== sessao.id) {
    notFound();
  }

  const itens = [
    ...consolidacao.itensDfd.map((it) => ({
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      quantidade: it.quantidade != null ? Number(it.quantidade) : null,
      valorUnit: it.valorUnit != null ? Number(it.valorUnit) : null,
      valorTotal: Number(it.valorTotal),
    })),
    ...consolidacao.itensTecnicos.map((it) => ({
      nome: it.item,
      quantidade: Number(it.quantidade),
      valorUnit: Number(it.valorUnit),
      valorTotal: Number(it.valorTotal),
    })),
  ];
  const totalItens = itens.reduce((soma, it) => soma + it.valorTotal, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Estudo Técnico Preliminar — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">Processo SEI: {consolidacao.processoSEI}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Itens objeto da licitação ({itens.length}) — anexo automático do ETP
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 font-medium">Qtd.</th>
                <th className="py-1 pr-2 font-medium">Valor unitário</th>
                <th className="py-1 font-medium">Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((it, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 text-slate-900">{it.nome}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{it.quantidade ?? "—"}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{it.valorUnit != null ? brl(it.valorUnit) : "—"}</td>
                  <td className="py-1.5 text-slate-600">{brl(it.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className="py-1.5 pr-2" colSpan={3}>
                  Total
                </td>
                <td className="py-1.5">{brl(totalItens)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {!consolidacao.estudoTecnicoPreliminar ? (
        <IniciarDocumentoBotao
          rotulo="Iniciar Estudo Técnico Preliminar"
          acao={criarEtpAction}
          consolidacaoTecnicaId={consolidacaoId}
        />
      ) : (
        <EtpForm
          pdfHref={`/consolidacao/${categoriaId}/etp/${consolidacaoId}/pdf`}
          etp={{
            id: consolidacao.estudoTecnicoPreliminar.id,
            objeto: consolidacao.estudoTecnicoPreliminar.objeto,
            localEntregaPrestacao: consolidacao.estudoTecnicoPreliminar.localEntregaPrestacao,
            necessidadeContratacao: consolidacao.estudoTecnicoPreliminar.necessidadeContratacao,
            referenciaPca: consolidacao.estudoTecnicoPreliminar.referenciaPca,
            requisitosContratacao: consolidacao.estudoTecnicoPreliminar.requisitosContratacao,
            estimativaQuantidadesMemoria: consolidacao.estudoTecnicoPreliminar.estimativaQuantidadesMemoria,
            levantamentoMercadoJustificativa: consolidacao.estudoTecnicoPreliminar.levantamentoMercadoJustificativa,
            estimativaPreliminarPrecos: consolidacao.estudoTecnicoPreliminar.estimativaPreliminarPrecos,
            descricaoSolucaoCompleta: consolidacao.estudoTecnicoPreliminar.descricaoSolucaoCompleta,
            justificativaParcelamento: consolidacao.estudoTecnicoPreliminar.justificativaParcelamento,
            resultadosEsperados: consolidacao.estudoTecnicoPreliminar.resultadosEsperados,
            providenciasAdministracao: consolidacao.estudoTecnicoPreliminar.providenciasAdministracao,
            contratacoesCorrelatas: consolidacao.estudoTecnicoPreliminar.contratacoesCorrelatas,
            impactosAmbientais: consolidacao.estudoTecnicoPreliminar.impactosAmbientais,
            declaracaoViabilidade: consolidacao.estudoTecnicoPreliminar.declaracaoViabilidade,
            status: consolidacao.estudoTecnicoPreliminar.status,
            responsavelNome: consolidacao.estudoTecnicoPreliminar.responsavelNome,
            responsavelMatricula: consolidacao.estudoTecnicoPreliminar.responsavelMatricula,
          }}
        />
      )}
    </div>
  );
}
