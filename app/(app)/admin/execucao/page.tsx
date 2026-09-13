import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { excluirAcessoExecucaoAction } from "@/lib/actions/admin";
import { SUBPERFIL_EXECUCAO_LABEL, subperfilEfetivoCategoria, subperfilPadraoCategoria } from "@/lib/execucao";
import NovoAcessoExecucaoForm from "./NovoAcessoExecucaoForm";
import RedefinirSenhaExecucaoForm from "./RedefinirSenhaExecucaoForm";
import RoteamentoCategoriaSelect from "./RoteamentoCategoriaSelect";
import AtuarComoBotao from "../AtuarComoBotao";
import BotaoExcluir from "../BotaoExcluir";

export default async function AdminExecucaoPage() {
  await exigirAdminNaPagina();
  const [acessos, unidades, categorias] = await Promise.all([
    prisma.acessoExecucao.findMany({ orderBy: { nome: "asc" }, include: { unidade: true } }),
    prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    prisma.categoria.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidade de Execução de Compras e Contratações</h1>
      <p className="text-sm text-slate-500">
        Acompanha a execução dos itens homologados com êxito na licitação, dividida em três subperfis:
        Obras, Serviços e Materiais e Patrimônio.
      </p>

      <NovoAcessoExecucaoForm unidades={unidades} />

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
                <td className="px-4 py-2 text-slate-600">{SUBPERFIL_EXECUCAO_LABEL[a.subperfil]}</td>
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
                  {!a.vinculado && <RedefinirSenhaExecucaoForm acessoId={a.id} />}
                  <AtuarComoBotao tipo="EXECUCAO" id={a.id} />
                  <BotaoExcluir action={excluirAcessoExecucaoAction} id={a.id} />
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

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Exceções de Roteamento por Categoria</h2>
        <p className="mb-3 text-xs text-slate-500">
          Por padrão, &quot;Obra ou Serviço de Engenharia&quot; vai para a Unidade de Obras, as demais
          categorias de serviço vão para a Unidade de Serviços, e categorias de material vão para a Unidade de
          Materiais e Patrimônio. Use esta tabela para excepcionar categorias específicas.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Categoria</th>
                <th className="py-1 pr-2 font-medium">Roteamento Padrão</th>
                <th className="py-1 pr-2 font-medium">Roteamento Efetivo</th>
                <th className="py-1 font-medium">Substituir por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((cat) => {
                const padrao = subperfilPadraoCategoria(cat.nome);
                const efetivo = subperfilEfetivoCategoria(cat.nome, cat.subperfilExecucaoOverride);
                return (
                  <tr key={cat.id}>
                    <td className="py-1.5 pr-2 text-slate-900">{cat.nome}</td>
                    <td className="py-1.5 pr-2 text-xs text-slate-600">{SUBPERFIL_EXECUCAO_LABEL[padrao]}</td>
                    <td className="py-1.5 pr-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${efetivo !== padrao ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {SUBPERFIL_EXECUCAO_LABEL[efetivo]}
                      </span>
                    </td>
                    <td className="py-1.5" style={{ width: 220 }}>
                      <RoteamentoCategoriaSelect categoriaId={cat.id} padrao={padrao} efetivo={efetivo} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
