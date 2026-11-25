import { prisma } from "@/lib/prisma";
import PendentesTabela from "./PendentesTabela";
import { AlertCircle, RefreshCw, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import DesfazerAprovacaoBotao from "./admin/demandas/DesfazerAprovacaoBotao";
import BotaoExcluir from "./admin/BotaoExcluir";
import { adminExcluirDfdAction } from "@/lib/actions/dfd";

export default async function AdminAprovacaoPage() {
  try {
    const [pendentes, historico, totalPendentesDistribuicao] = await Promise.all([
      prisma.dfd.findMany({
        where: { status: "AGUARDANDO_APROVACAO" },
        include: {
          unidade: true,
          itens: {
            select: {
              id: true,
              valorTotal: true,
              codigoPncpReferencia: true,
              categoria: {
                select: {
                  nome: true,
                  codigoPcaPadrao: true,
                  fluxoContinuo: true,
                  ignoraPCA: true,
                  setorTecnico: { select: { nome: true } },
                },
              },
            },
          },
          prioridade: true,
        },
        orderBy: [{ ano: "desc" }, { enviadoParaAprovacaoEm: "asc" }],
      }),
      prisma.dfd.findMany({
        where: { status: { in: ["APROVADO", "REPROVADO"] } },
        include: {
          unidade: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.dfd.count({
        where: { status: "APROVADO", statusEncaminhamento: "PENDENTE_DISTRIBUICAO" },
      }),
    ]);

    return (
      <div className="space-y-6">
        {totalPendentesDistribuicao > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003366] text-white">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {totalPendentesDistribuicao} demanda(s) aprovada(s) aguardando distribuição
                </h2>
                <p className="text-xs text-slate-600">
                  Etapa intermediária: confirme o encaminhamento para os Setores Técnicos padrão ou comissões especiais.
                </p>
              </div>
            </div>
            <Link
              href="/admin/encaminhamento"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#003366] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#002244] transition"
            >
              <span>Distribuir Demandas</span>
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
        <h1 className="text-lg font-semibold text-slate-900">
          Aprovação de DFDs ({pendentes.length} pendentes)
        </h1>
        <p className="text-sm text-slate-500">
          A cota orçamentária já é reservada assim que o DFD é enviado, mesmo antes da aprovação.
        </p>

        <PendentesTabela
          pendentes={pendentes.map((d) => {
            const primeiroItem = d.itens?.[0];
            const cat = primeiroItem?.categoria;
            return {
              id: d.id,
              ano: d.ano,
              numero: d.numero,
              descricaoSumaria: d.descricaoSumaria || "DFD sem descrição",
              unidadeNome: d.unidade?.nome || "Unidade não identificada",
              setorTecnicoNome: cat?.setorTecnico?.nome || (cat?.fluxoContinuo ? "SDHP / PROAD (Fluxo Contínuo)" : "—"),
              processoSeiOrigem: d.processoSeiOrigem,
              idSeiDfdOrigem: d.idSeiDfdOrigem,
              prioridadeFrase: d.prioridade?.frase || "Prioridade não definida",
              totalItens: d.itens?.length || 0,
              totalValor: (d.itens || []).reduce((s, it) => s + Number(it.valorTotal || 0), 0),
              enviadoParaAprovacaoEm: d.enviadoParaAprovacaoEm,
            };
          })}
        />

        {historico.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Histórico recente</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Descrição</th>
                  <th className="py-1 font-medium">Unidade</th>
                  <th className="py-1 font-medium">Status</th>
                  <th className="py-1 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historico.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 text-slate-900">{d.descricaoSumaria}</td>
                    <td className="py-2 text-slate-600">{d.unidade?.nome || "—"}</td>
                    <td className="py-2 text-slate-600">
                      {d.status === "APROVADO"
                        ? "Aprovado"
                        : `Reprovado — ${d.motivoReprovacao || "Sem motivo registrado"}`}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/dfd/${d.id}`}
                          className="text-xs font-medium text-[#003366] underline hover:text-[#002244]"
                        >
                          Ver / Editar
                        </Link>
                        {d.status === "APROVADO" && <DesfazerAprovacaoBotao dfdId={d.id} />}
                        <BotaoExcluir
                          action={adminExcluirDfdAction}
                          id={d.id}
                          confirmMessage="Excluir este DFD permanentemente?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  } catch (error: any) {
    console.error("[AdminAprovacaoPage] Erro ao carregar DFDs para aprovação:", error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Aprovação de DFDs</h1>
          <p className="text-sm text-slate-500">Painel administrativo de aprovação da PROAD</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-900">
                Instabilidade temporária ao carregar a lista de aprovação
              </h2>
              <p className="text-xs text-amber-800 leading-relaxed">
                O banco de dados do PCA está concluindo uma sincronização de esquema ou inicializando a conexão.
                Tente recarregar a página em alguns instantes.
              </p>
              {error?.message && (
                <p className="font-mono text-[11px] text-amber-700 bg-white/70 p-2 rounded border border-amber-200/60 break-all">
                  Detalhe: {error.message}
                </p>
              )}
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#002244]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Recarregar página</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
