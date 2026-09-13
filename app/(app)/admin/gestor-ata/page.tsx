import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { excluirAcessoGestorAtaAction } from "@/lib/actions/admin";
import { formatarDataHora } from "@/lib/formato";
import NovoAcessoGestorAtaForm from "./NovoAcessoGestorAtaForm";
import RedefinirSenhaGestorAtaForm from "./RedefinirSenhaGestorAtaForm";
import AutorizarExecucaoAtaBotao from "./AutorizarExecucaoAtaBotao";
import AtuarComoBotao from "../AtuarComoBotao";
import BotaoExcluir from "../BotaoExcluir";

export default async function AdminGestorAtaPage() {
  await exigirAdminNaPagina();
  const [acessos, unidades, consolidacoesAta] = await Promise.all([
    prisma.acessoGestorAta.findMany({ orderBy: { nome: "asc" }, include: { unidade: true } }),
    prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    prisma.consolidacaoTecnica.findMany({
      where: { tipoContratacao: "ATA", solicitacaoExecucaoAtaEm: { not: null }, ataAutorizadaEm: null },
      include: { categoria: true },
      orderBy: { solicitacaoExecucaoAtaEm: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidade Gestora de Ata</h1>

      {consolidacoesAta.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Solicitações de Execução de Ata — Aguardando Autorização ({consolidacoesAta.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            A Unidade Gestora de Ata solicitou autorização para dar início à execução destes processos.
          </p>
          <div className="space-y-3">
            {consolidacoesAta.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{c.categoria.nome}</p>
                  <p className="text-xs text-slate-500">
                    Processo SEI: {c.processoSEI} · Solicitado em {formatarDataHora(c.solicitacaoExecucaoAtaEm)}
                  </p>
                </div>
                <AutorizarExecucaoAtaBotao consolidacaoId={c.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <NovoAcessoGestorAtaForm unidades={unidades} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Login</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {acessos.map((a) => (
              <tr key={a.id} className={a.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{a.nome}</td>
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
                  {!a.vinculado && <RedefinirSenhaGestorAtaForm acessoId={a.id} />}
                  <AtuarComoBotao tipo="GESTOR_ATA" id={a.id} />
                  <BotaoExcluir action={excluirAcessoGestorAtaAction} id={a.id} />
                </td>
              </tr>
            ))}
            {acessos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
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
