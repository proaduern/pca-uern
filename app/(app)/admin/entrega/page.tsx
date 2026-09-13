import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { excluirAcessoEntregaAction } from "@/lib/actions/admin";
import { itensAguardandoAutorizacaoEntrega } from "@/lib/actions/entrega";
import { SUBPERFIL_ENTREGA_LABEL, subperfilBensPorTipo } from "@/lib/entrega";
import NovoAcessoEntregaForm from "./NovoAcessoEntregaForm";
import RedefinirSenhaEntregaForm from "./RedefinirSenhaEntregaForm";
import AutorizarEntregaTabela from "./AutorizarEntregaTabela";
import RatificarContestacaoBotoes from "./RatificarContestacaoBotoes";
import AtuarComoBotao from "../AtuarComoBotao";
import BotaoExcluir from "../BotaoExcluir";

export default async function AdminEntregaPage() {
  await exigirAdminNaPagina();
  const [acessos, aguardandoAutorizacao, contestacoesPendentesAdmin] = await Promise.all([
    prisma.acessoEntrega.findMany({ orderBy: { nome: "asc" }, include: { unidade: true } }),
    itensAguardandoAutorizacaoEntrega(),
    prisma.confirmacaoEntrega.findMany({
      where: { status: "CONTESTACAO_PENDENTE_ADMIN" },
      include: { entrega: { include: { unidade: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidade de Entrega de Bens</h1>

      {contestacoesPendentesAdmin.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Contestações Aguardando Ratificação da Administração ({contestacoesPendentesAdmin.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            A Unidade de Entrega de Bens já analisou e aprovou estas contestações. Cabe à administração
            ratificar (aceitar que a entrega não foi de fato efetivada) ou manter a entrega como válida.
          </p>
          <div className="space-y-3">
            {contestacoesPendentesAdmin.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{c.entrega.itemNome}</p>
                  <p className="text-xs text-slate-500">Unidade: {c.entrega.unidade?.nome ?? "—"}</p>
                  <p className="mt-1 text-xs italic text-slate-600">Motivo do demandante: {c.contestacaoMotivo}</p>
                  <p className="text-xs text-slate-500">
                    Parecer da Unidade de Entrega de Bens: aprovou o encaminhamento da contestação.
                  </p>
                </div>
                <RatificarContestacaoBotoes entregaId={c.entregaId} />
              </div>
            ))}
          </div>
        </div>
      )}

      {aguardandoAutorizacao.length > 0 && (
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Itens Recebidos — Autorizar Entrega ({aguardandoAutorizacao.length})
            </h2>
            <p className="text-xs text-slate-500">
              A Unidade de Materiais e Patrimônio (Execução) já confirmou o recebimento definitivo destes
              itens. Antes que o setor responsável pela entrega possa agir, a PROAD precisa autorizar.
            </p>
          </div>
          <AutorizarEntregaTabela
            pendentes={aguardandoAutorizacao.map((it) => ({
              id: it.id,
              itemNome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
              unidadeNome: it.dfd.unidade.nome,
              subperfilBens: subperfilBensPorTipo(it.tipoBem),
              enquadramento: it.enquadramento,
              processoSEIExecucao: it.processoExecucao?.processoSEIExecucao ?? "—",
              valor: Number(it.valorAdjudicado ?? it.valorTotal),
            }))}
          />
        </div>
      )}

      <NovoAcessoEntregaForm unidades={await prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } })} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Subperfil</th>
              <th className="px-4 py-2 font-medium">Login</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {acessos.map((a) => (
              <tr key={a.id} className={a.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{a.nome}</td>
                <td className="px-4 py-2 text-slate-600">{SUBPERFIL_ENTREGA_LABEL[a.subperfil]}</td>
                <td className="px-4 py-2 text-slate-600">
                  {a.vinculado ? (
                    <>
                      {a.unidade?.email}{" "}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">vinculado a {a.unidade?.nome}</span>
                    </>
                  ) : (
                    a.email
                  )}
                </td>
                <td className="px-4 py-2 space-y-1">
                  {!a.vinculado && <RedefinirSenhaEntregaForm acessoId={a.id} />}
                  <AtuarComoBotao tipo="ENTREGA" id={a.id} />
                  <BotaoExcluir action={excluirAcessoEntregaAction} id={a.id} />
                </td>
              </tr>
            ))}
            {acessos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nenhum acesso cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
