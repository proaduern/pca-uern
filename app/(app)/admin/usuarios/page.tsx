import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { excluirUsuarioAction } from "@/lib/actions/admin";
import NovoUsuarioForm from "./NovoUsuarioForm";
import EditarUsuarioForm from "./EditarUsuarioForm";
import RedefinirSenhaUsuarioForm from "./RedefinirSenhaUsuarioForm";
import AtuarComoUsuarioBotao from "./AtuarComoUsuarioBotao";
import AlternarStatusUsuarioBotao from "./AlternarStatusUsuarioBotao";
import BotaoExcluir from "../BotaoExcluir";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Building2,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    busca?: string;
    unidadeId?: string;
    status?: string;
  }>;
}

export default async function AdminUsuariosPage({ searchParams }: PageProps) {
  await exigirAdminNaPagina();
  const { busca, unidadeId, status } = await searchParams;

  // Carregar unidades ativas para opções de filtro e formulário
  const unidades = await prisma.unidade.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  // Filtros dinâmicos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    role: "UNIDADE",
  };

  if (busca && busca.trim().length > 0) {
    const termo = busca.trim();
    where.OR = [
      { nome: { contains: termo, mode: "insensitive" } },
      { email: { contains: termo, mode: "insensitive" } },
      { matricula: { contains: termo, mode: "insensitive" } },
      { cargo: { contains: termo, mode: "insensitive" } },
    ];
  }

  if (unidadeId && unidadeId !== "todas") {
    where.unidadeId = unidadeId;
  }

  if (status === "ativos") {
    where.ativo = true;
  } else if (status === "inativos") {
    where.ativo = false;
  }

  const [usuarios, totalGeral, totalAtivos, totalUnidadesComUsuarios] = await Promise.all([
    prisma.usuario.findMany({
      where,
      include: {
        unidade: {
          select: { id: true, nome: true },
        },
      },
      orderBy: [
        { unidade: { nome: "asc" } },
        { nome: "asc" },
      ],
    }),
    prisma.usuario.count({ where: { role: "UNIDADE" } }),
    prisma.usuario.count({ where: { role: "UNIDADE", ativo: true } }),
    prisma.unidade.count({
      where: {
        usuarios: {
          some: {},
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Usuários das Unidades
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#003366]">
              {totalGeral} {totalGeral === 1 ? "usuário" : "usuários"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os servidores vinculados às unidades da UERN e defina individualmente o que cada um pode fazer no PCA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NovoUsuarioForm unidades={unidades} unidadeSelecionadaId={unidadeId !== "todas" ? unidadeId : undefined} />
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#003366]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Cadastrado</p>
              <p className="text-xl font-bold text-slate-900">{totalGeral}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Usuários Ativos</p>
              <p className="text-xl font-bold text-emerald-700">{totalAtivos}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Unidades com Usuários</p>
              <p className="text-xl font-bold text-slate-900">{totalUnidadesComUsuarios}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="busca"
              defaultValue={busca ?? ""}
              placeholder="Buscar por nome, email @uern.br, matrícula ou cargo..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                name="unidadeId"
                defaultValue={unidadeId ?? "todas"}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-600"
              >
                <option value="todas">Todas as Unidades</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                name="status"
                defaultValue={status ?? "todos"}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-600"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativos">Apenas Ativos</option>
                <option value="inativos">Apenas Inativos</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <Filter className="h-4 w-4" />
              <span>Filtrar</span>
            </button>

            {(busca || (unidadeId && unidadeId !== "todas") || (status && status !== "todos")) && (
              <Link
                href="/admin/usuarios"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Limpar
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Tabela de Usuários */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Unidade Vinculada</th>
              <th className="px-4 py-3">Permissões no PCA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-medium text-slate-700">Nenhum usuário encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {busca || unidadeId ? "Tente ajustar seus filtros de busca." : "Cadastre o primeiro usuário de unidade no botão acima."}
                  </p>
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                // Cálculo de permissões ativas
                const totalPerms = 9;
                const permsAtivas = [
                  u.podeCriarDfd,
                  u.podeEditarDfd,
                  u.podeEnviarDfd,
                  u.podeExcluirDfd,
                  u.podeSolicitarCatalogo,
                  u.podeSolicitarCotaGeral,
                  u.podeConfirmarEntrega,
                  u.podeGerenciarSetores,
                  u.podeEditarDadosUnidade,
                ].filter(Boolean).length;

                return (
                  <tr key={u.id} className={`hover:bg-slate-50/60 transition ${!u.ativo ? "bg-slate-50/40 opacity-70" : ""}`}>
                    {/* Usuário info */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{u.nome}</span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                        {(u.cargo || u.matricula) && (
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            {[u.cargo, u.matricula ? `Matrícula: ${u.matricula}` : null].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unidade */}
                    <td className="px-4 py-3">
                      {u.unidade ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-[#003366] shrink-0" />
                          <span className="font-medium text-slate-800 text-xs">
                            {u.unidade.nome}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-amber-600">Sem unidade</span>
                      )}
                    </td>

                    {/* Permissões */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              permsAtivas === totalPerms
                                ? "bg-emerald-100 text-emerald-800"
                                : permsAtivas >= 5
                                ? "bg-blue-100 text-blue-800"
                                : permsAtivas > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {permsAtivas === totalPerms
                              ? "Acesso Total (9/9)"
                              : permsAtivas === 0
                              ? "Apenas Consulta (0/9)"
                              : `${permsAtivas} de 9 ativas`}
                          </span>
                        </div>

                        {/* Pílulas de resumo detalhado */}
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {u.podeCriarDfd && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Criar DFD</span>}
                          {u.podeEditarDfd && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Editar DFD</span>}
                          {u.podeEnviarDfd && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">Enviar DFD</span>}
                          {u.podeExcluirDfd && <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">Excluir</span>}
                          {u.podeSolicitarCatalogo && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Catálogo</span>}
                          {u.podeSolicitarCotaGeral && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Cota Geral</span>}
                          {u.podeConfirmarEntrega && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Entrega</span>}
                          {u.podeGerenciarSetores && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Setores</span>}
                          {u.podeEditarDadosUnidade && <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Dados Unidade</span>}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {u.ativo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <XCircle className="h-3.5 w-3.5 text-slate-400" />
                          Inativo
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {u.ativo && (
                          <AtuarComoUsuarioBotao
                            usuarioId={u.id}
                            nomeUsuario={u.nome}
                          />
                        )}

                        <EditarUsuarioForm
                          usuario={{
                            id: u.id,
                            nome: u.nome,
                            email: u.email,
                            matricula: u.matricula,
                            cargo: u.cargo,
                            telefone: u.telefone,
                            unidadeId: u.unidadeId,
                            ativo: u.ativo,
                            podeCriarDfd: u.podeCriarDfd,
                            podeEditarDfd: u.podeEditarDfd,
                            podeEnviarDfd: u.podeEnviarDfd,
                            podeExcluirDfd: u.podeExcluirDfd,
                            podeSolicitarCatalogo: u.podeSolicitarCatalogo,
                            podeSolicitarCotaGeral: u.podeSolicitarCotaGeral,
                            podeConfirmarEntrega: u.podeConfirmarEntrega,
                            podeGerenciarSetores: u.podeGerenciarSetores,
                            podeEditarDadosUnidade: u.podeEditarDadosUnidade,
                          }}
                          unidades={unidades}
                        />

                        <RedefinirSenhaUsuarioForm usuarioId={u.id} />

                        <AlternarStatusUsuarioBotao id={u.id} ativo={u.ativo} />

                        <BotaoExcluir
                          action={excluirUsuarioAction}
                          id={u.id}
                          confirmMessage={`Tem certeza que deseja excluir o usuário ${u.nome}?`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
