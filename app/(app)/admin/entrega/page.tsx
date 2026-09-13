import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { excluirAcessoEntregaAction } from "@/lib/actions/admin";
import { itensAguardandoAutorizacaoEntrega } from "@/lib/actions/entrega";
import {
  propostasAtendimentoEstoquePendentes,
  todasTrocasOPPendentes,
  trocaOPExtrapolaSaldo,
  itensEstoqueGeral,
} from "@/lib/actions/estoque";
import { SUBPERFIL_ENTREGA_LABEL, subperfilBensPorTipo } from "@/lib/entrega";
import { resolverFaseItemPipelineDfd } from "@/lib/fase-item";
import { brl, formatarData, formatarDataHora } from "@/lib/formato";
import NovoAcessoEntregaForm from "./NovoAcessoEntregaForm";
import RedefinirSenhaEntregaForm from "./RedefinirSenhaEntregaForm";
import AutorizarEntregaTabela from "./AutorizarEntregaTabela";
import RatificarContestacaoBotoes from "./RatificarContestacaoBotoes";
import TrocaOPTriagemBotoes from "./TrocaOPTriagemBotoes";
import TrocaOPAutorizacaoFinalBotoes from "./TrocaOPAutorizacaoFinalBotoes";
import AtendimentoEstoqueBotoes from "./AtendimentoEstoqueBotoes";
import AtuarComoBotao from "../AtuarComoBotao";
import BotaoExcluir from "../BotaoExcluir";

const BADGE_CLASSE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

export default async function AdminEntregaPage() {
  await exigirAdminNaPagina();
  const [acessos, aguardandoAutorizacao, contestacoesPendentesAdmin, { triagem, autorizacaoFinal }, propostasEstoque, estoqueGeral] =
    await Promise.all([
      prisma.acessoEntrega.findMany({ orderBy: { nome: "asc" }, include: { unidade: true } }),
      itensAguardandoAutorizacaoEntrega(),
      prisma.confirmacaoEntrega.findMany({
        where: { status: "CONTESTACAO_PENDENTE_ADMIN" },
        include: { entrega: { include: { unidade: true } } },
        orderBy: { createdAt: "desc" },
      }),
      todasTrocasOPPendentes(),
      propostasAtendimentoEstoquePendentes(),
      itensEstoqueGeral(),
    ]);

  const autorizacaoFinalComExtrapolacao = await Promise.all(
    autorizacaoFinal.map(async (t) => ({ troca: t, extrapola: await trocaOPExtrapolaSaldo(t.id) })),
  );
  const estoqueGeralComFase = await Promise.all(
    estoqueGeral.map(async (it) => ({ item: it, fase: await resolverFaseItemPipelineDfd(it.id) })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidade de Entrega de Bens</h1>

      {estoqueGeralComFase.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Itens em Estoque Geral (ex-OP atendidos por estoque) — {estoqueGeralComFase.length}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Estes itens deixaram de ter destinatário específico após um atendimento por estoque ou troca
              aprovados. Eles seguem seu próprio ciclo normal (licitação → execução → estoque), agora como
              reposição geral vinculada ao Patrimônio — o progresso abaixo só conta para a Execução do PCA,
              não para nenhuma unidade demandante.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Estoque geral desde</th>
                <th className="px-4 py-2 font-medium">Situação Atual (fluxo real)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estoqueGeralComFase.map(({ item, fase }) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-slate-900">{item.itemCatalogoNome ?? item.itemNomeLivre}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{item.categoria.nome}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{formatarData(item.estoqueGeralDesde)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${BADGE_CLASSE[fase.badge]}`}>{fase.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {triagem.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Trocas de Item (OP) — Triagem Inicial ({triagem.length})</h2>
          <p className="mb-3 text-xs text-slate-500">
            O demandante solicitou trocar um item OP por outro. Decida se a solicitação segue para o
            Patrimônio verificar disponibilidade em estoque.
          </p>
          <div className="space-y-3">
            {triagem.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Trocar &quot;{t.itemDfd.itemCatalogoNome ?? t.itemDfd.itemNomeLivre}&quot; por &quot;{t.itemBNome}&quot;
                  </p>
                  <p className="text-xs text-slate-500">
                    Unidade: {t.itemDfd.dfd.unidade.nome} · Valor atual: {brl(t.itemDfd.valorTotal)} → Valor pretendido: {brl(t.itemBValor)}
                    {!t.itemBOrigemCatalogo && " (fora do catálogo)"}
                  </p>
                  <p className="mt-1 text-xs italic text-slate-600">Justificativa: {t.justificativaDemandante}</p>
                </div>
                <TrocaOPTriagemBotoes trocaId={t.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {autorizacaoFinalComExtrapolacao.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Trocas de Item (OP) — Autorização Final ({autorizacaoFinalComExtrapolacao.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            O Patrimônio confirmou disponibilidade em estoque. Autorize para concluir a troca, ou rejeite.
          </p>
          <div className="space-y-3">
            {autorizacaoFinalComExtrapolacao.map(({ troca: t, extrapola }) => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Trocar &quot;{t.itemDfd.itemCatalogoNome ?? t.itemDfd.itemNomeLivre}&quot; por &quot;{t.itemBNome}&quot;
                  </p>
                  <p className="text-xs text-slate-500">
                    Unidade: {t.itemDfd.dfd.unidade.nome} · Valor atual: {brl(t.itemDfd.valorTotal)} → Valor pretendido: {brl(t.itemBValor)}
                  </p>
                  <p className="text-xs text-slate-500">Patrimônio confirmou disponibilidade em {formatarDataHora(t.analisePatrimonioEm)}</p>
                  {extrapola && (
                    <p className="text-xs text-red-600">
                      <b>Atenção:</b> esta troca fará o saldo de Cota OP da unidade ficar negativo.
                    </p>
                  )}
                </div>
                <TrocaOPAutorizacaoFinalBotoes trocaId={t.id} extrapola={extrapola} />
              </div>
            ))}
          </div>
        </div>
      )}

      {propostasEstoque.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Propostas de Atendimento por Estoque — Aguardando Análise ({propostasEstoque.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            A Unidade de Patrimônio identificou estoque disponível para atender de imediato uma demanda OP já
            consolidada, antes do fim da licitação. Ao aprovar, o item consolidado deixa de ser vinculado ao
            demandante e passa a ser estoque geral; a entrega imediata via estoque já conta como executada
            para a unidade demandante.
          </p>
          <div className="space-y-3">
            {propostasEstoque.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{p.itemDfd.itemCatalogoNome ?? p.itemDfd.itemNomeLivre}</p>
                  <p className="text-xs text-slate-500">
                    Unidade demandante: {p.itemDfd.dfd.unidade.nome} · Categoria: {p.itemDfd.categoria.nome} · Valor:{" "}
                    {brl(p.itemDfd.valorTotal)}
                  </p>
                </div>
                <AtendimentoEstoqueBotoes atendimentoId={p.id} />
              </div>
            ))}
          </div>
        </div>
      )}

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
