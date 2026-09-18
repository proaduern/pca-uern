import { prisma } from "@/lib/prisma";
import { criarPesquisaPrecosAction, excluirPesquisaPrecosAction, redefinirSenhaPesquisaPrecosAction } from "@/lib/actions/admin";
import AcessoVinculadoLicitacoesForm from "../AcessoVinculadoLicitacoesForm";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaGenericaForm from "../RedefinirSenhaGenericaForm";
import AtuarComoBotao from "../AtuarComoBotao";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function PesquisaPrecosPage() {
  await exigirAdminNaPagina();
  const [acessos, licitacoesList] = await Promise.all([
    prisma.pesquisaPrecos.findMany({ orderBy: { nome: "asc" }, include: { licitacoes: true } }),
    prisma.licitacoes.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Pesquisa de Preços</h1>
      <p className="text-sm text-slate-500">
        Subsetor vinculado à Diretoria de Licitações e Contratos, responsável por conduzir a
        pesquisa de preços e registrar seus resultados no sistema.
      </p>

      <AcessoVinculadoLicitacoesForm
        action={criarPesquisaPrecosAction}
        titulo="Novo acesso"
        licitacoesList={licitacoesList}
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Servidor</th>
              <th className="px-4 py-2 font-medium">Matrícula</th>
              <th className="px-4 py-2 font-medium">Função</th>
              <th className="px-4 py-2 font-medium">Login</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {acessos.map((p) => (
              <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{p.nome}</td>
                <td className="px-4 py-2 text-slate-600">{p.matricula}</td>
                <td className="px-4 py-2 text-slate-600">{p.funcao}</td>
                <td className="px-4 py-2 text-slate-600">
                  {p.vinculado ? (
                    <>
                      {p.licitacoes?.email}{" "}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        vinculado a {p.licitacoes?.nome}
                      </span>
                    </>
                  ) : (
                    p.email
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{p.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  {!p.vinculado && (
                    <RedefinirSenhaGenericaForm id={p.id} action={redefinirSenhaPesquisaPrecosAction} />
                  )}
                  <AtuarComoBotao tipo="PESQUISA_PRECOS" id={p.id} />
                  <BotaoExcluir action={excluirPesquisaPrecosAction} id={p.id} />
                </td>
              </tr>
            ))}
            {acessos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
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
