import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { adminExcluirDfdAction } from "@/lib/actions/dfd";
import { brl } from "@/lib/formato";
import BotaoExcluir from "../BotaoExcluir";
import DesfazerAprovacaoBotao from "./DesfazerAprovacaoBotao";
import ImportarDfdsForm from "./ImportarDfdsForm";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

export default async function DemandasPage() {
  await exigirAdminNaPagina();

  const [dfds, tipificacoes] = await Promise.all([
    prisma.dfd.findMany({
      include: { unidade: true, prioridade: true, itens: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tipificacao.findMany(),
  ]);
  const nomeTipificacao = (id: string | null) =>
    tipificacoes.find((t) => t.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Todas as Demandas Lançadas ({dfds.length})
      </h1>
      <p className="text-sm text-slate-500">
        A PROAD pode ver e editar qualquer DFD daqui, em qualquer status. Editar um DFD já
        aprovado o devolve para &quot;aguardando aprovação&quot;.
      </p>

      <ImportarDfdsForm />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Unidade</th>
              <th className="px-4 py-2 font-medium">Descrição Sumária</th>
              <th className="px-4 py-2 font-medium">Tipificação</th>
              <th className="px-4 py-2 font-medium">Prioridade</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor Total</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dfds.map((d) => {
              const total = d.itens.reduce((s, it) => s + Number(it.valorTotal), 0);
              return (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-slate-600">{d.unidade.nome}</td>
                  <td className="px-4 py-2 text-slate-900">
                    {d.descricaoSumaria || <span className="text-slate-400">(sem descrição)</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{nomeTipificacao(d.tipificacaoId)}</td>
                  <td className="px-4 py-2 text-slate-600">{d.prioridade.frase}</td>
                  <td className="px-4 py-2 text-slate-600">{d.itens.length}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(total)}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dfd/${d.id}`} className="text-xs text-slate-700 underline">
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
              );
            })}
            {dfds.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum DFD lançado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
