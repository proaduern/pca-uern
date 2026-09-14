import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl, formatarData } from "@/lib/formato";
import { statusLicitacaoLabel } from "@/lib/licitacao";

const PRIORIDADE_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };
const TIPO_CONTRATACAO_LABEL: Record<string, string> = {
  NORMAL: "Contratação Normal",
  ATA: "Ata de Registro de Preços",
};

export default async function LicitacoesHomePage() {
  const consolidacoes = await prisma.consolidacaoTecnica.findMany({
    include: {
      categoria: true,
      setorTecnico: true,
      statusLicitacao: { orderBy: { createdAt: "desc" } },
      itensDfd: { select: { valorTotal: true, resultadoHomologacao: true } },
      itensTecnicos: { select: { valorTotal: true, resultadoHomologacao: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = (c: (typeof consolidacoes)[number]) =>
    c.itensDfd.reduce((s, it) => s + Number(it.valorTotal), 0) +
    c.itensTecnicos.reduce((s, it) => s + Number(it.valorTotal), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Processos Consolidados pelos Setores Técnicos</h1>
      <p className="text-sm text-slate-500">
        Todos os processos consolidados, de todas as categorias e setores técnicos.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Setor Técnico</th>
              <th className="px-4 py-2 font-medium">Processo SEI</th>
              <th className="px-4 py-2 font-medium">Prioridade</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Conclusão Esperada</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor Total</th>
              <th className="px-4 py-2 font-medium">Status Atual</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consolidacoes.map((c) => {
              const statusAtual = c.statusLicitacao[0]?.status ?? null;
              const jaHomologou = c.statusLicitacao.some((s) => s.status === "HOMOLOGADO");
              const pendentesHomologacao = jaHomologou
                ? c.itensDfd.filter((it) => !it.resultadoHomologacao).length +
                  c.itensTecnicos.filter((it) => !it.resultadoHomologacao).length
                : 0;
              const prioridadeAtual = c.revisaoPrioridade ?? c.prioridade;
              const dataAtual = c.revisaoDataEsperadaConclusao ?? c.dataEsperadaConclusao;
              return (
                <tr key={c.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-900">
                    <Link href={`/licitacoes/${c.id}`} className="block">
                      {c.categoria.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.setorTecnico.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{c.processoSEI}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {PRIORIDADE_LABEL[prioridadeAtual]}
                    {c.revisaoPrioridade && (
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        Revisada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{TIPO_CONTRATACAO_LABEL[c.tipoContratacao]}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatarData(dataAtual)}
                    {c.revisaoDataEsperadaConclusao && (
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        Revisada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.itensDfd.length + c.itensTecnicos.length}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(total(c))}</td>
                  <td className="px-4 py-2">
                    {statusAtual ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                        {statusLicitacaoLabel(statusAtual)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Sem status</span>
                    )}
                    {pendentesHomologacao > 0 && (
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        Homologação Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/licitacoes/${c.id}`} className="text-xs text-slate-700 underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {consolidacoes.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma consolidação recebida ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
