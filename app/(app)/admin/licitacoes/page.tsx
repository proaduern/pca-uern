import { prisma } from "@/lib/prisma";
import { criarLicitacoesAction, excluirLicitacoesAction } from "@/lib/actions/admin";
import AcessoVinculavelForm from "../AcessoVinculavelForm";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaLicitacoesForm from "./RedefinirSenhaLicitacoesForm";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function LicitacoesPage() {
  await exigirAdminNaPagina();
  const [acessos, unidades] = await Promise.all([
    prisma.licitacoes.findMany({ orderBy: { nome: "asc" }, include: { unidade: true } }),
    prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidade de Licitações e Contratos</h1>
      <p className="text-sm text-slate-500">
        Esta unidade (ex.: Diretoria de Licitações e Contratos) enxerga todos os processos
        consolidados por todos os setores técnicos, independente da categoria.
      </p>

      <AcessoVinculavelForm action={criarLicitacoesAction} titulo="Novo acesso" unidades={unidades} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Login</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {acessos.map((l) => (
              <tr key={l.id} className={l.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{l.nome}</td>
                <td className="px-4 py-2 text-slate-600">
                  {l.vinculado ? (
                    <>
                      {l.unidade?.email}{" "}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        vinculado a {l.unidade?.nome}
                      </span>
                    </>
                  ) : (
                    l.email
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{l.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  {!l.vinculado && <RedefinirSenhaLicitacoesForm licitacoesId={l.id} />}
                  <BotaoExcluir action={excluirLicitacoesAction} id={l.id} />
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
