import { prisma } from "@/lib/prisma";
import {
  criarAgenteContratacaoAction,
  excluirAgenteContratacaoAction,
  redefinirSenhaAgenteContratacaoAction,
} from "@/lib/actions/admin";
import AcessoVinculadoLicitacoesForm from "../AcessoVinculadoLicitacoesForm";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaGenericaForm from "../RedefinirSenhaGenericaForm";
import AtuarComoBotao from "../AtuarComoBotao";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function AgentesContratacaoPage() {
  await exigirAdminNaPagina();
  const [acessos, licitacoesList] = await Promise.all([
    prisma.agenteContratacao.findMany({ orderBy: { nome: "asc" }, include: { licitacoes: true } }),
    prisma.licitacoes.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Agentes de Contratação</h1>
      <p className="text-sm text-slate-500">
        Subsetor vinculado à Diretoria de Licitações e Contratos, responsável por elaborar a
        Minuta de Edital e, mais adiante, conduzir o certame dos processos a ele designados.
      </p>

      <AcessoVinculadoLicitacoesForm
        action={criarAgenteContratacaoAction}
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
            {acessos.map((a) => (
              <tr key={a.id} className={a.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{a.nome}</td>
                <td className="px-4 py-2 text-slate-600">{a.matricula}</td>
                <td className="px-4 py-2 text-slate-600">{a.funcao}</td>
                <td className="px-4 py-2 text-slate-600">
                  {a.vinculado ? (
                    <>
                      {a.licitacoes?.email}{" "}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        vinculado a {a.licitacoes?.nome}
                      </span>
                    </>
                  ) : (
                    a.email
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{a.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  {!a.vinculado && (
                    <RedefinirSenhaGenericaForm id={a.id} action={redefinirSenhaAgenteContratacaoAction} />
                  )}
                  <AtuarComoBotao tipo="AGENTE_CONTRATACAO" id={a.id} />
                  <BotaoExcluir action={excluirAgenteContratacaoAction} id={a.id} />
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
