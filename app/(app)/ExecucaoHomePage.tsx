import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcularAtrasoExecucao, statusExecucaoLabel, subperfilEfetivoCategoria } from "@/lib/execucao";

export default async function ExecucaoHomePage({ acessoExecucaoId }: { acessoExecucaoId: string }) {
  const acesso = await prisma.acessoExecucao.findUniqueOrThrow({ where: { id: acessoExecucaoId } });

  const consolidacoesHomologadas = await prisma.consolidacaoTecnica.findMany({
    where: {
      statusLicitacao: { some: { status: "REMETIDO_EXECUCAO" } },
    },
    include: {
      categoria: true,
      statusLicitacao: { orderBy: { createdAt: "desc" }, take: 1 },
      itensDfd: { select: { id: true, resultadoHomologacao: true, processoExecucaoId: true } },
      itensTecnicos: { select: { id: true, resultadoHomologacao: true, processoExecucaoId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // Só a última linha de status importa (REMETIDO_EXECUCAO precisa ser o status atual, não só ter passado por ele).
  const homologacoesDoSubperfil = consolidacoesHomologadas
    .filter((c) => c.statusLicitacao[0]?.status === "REMETIDO_EXECUCAO")
    .filter((c) => subperfilEfetivoCategoria(c.categoria.nome, c.categoria.subperfilExecucaoOverride) === acesso.subperfil)
    .map((cons) => ({ cons }));

  const meusProcessos = await prisma.processoExecucao.findMany({
    where: { acessoExecucaoId },
    include: { statusExecucao: { orderBy: { createdAt: "desc" }, take: 1 }, itensDfd: true, itensTecnicos: true },
    orderBy: { createdAt: "desc" },
  });
  const emAtraso = meusProcessos.filter((p) => {
    const st = p.statusExecucao[0];
    return calcularAtrasoExecucao(st?.status ?? null, st?.dataEnvio ?? null, st?.prazoDias ?? null);
  }).length;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Painel da Unidade de Execução de Compras e Contratações
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Processos licitatórios homologados de minha competência</p>
          <p className="text-xl font-semibold text-slate-900">{homologacoesDoSubperfil.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Processos de execução abertos</p>
          <p className="text-xl font-semibold text-slate-900">{meusProcessos.length}</p>
        </div>
        <div className={`rounded-lg border p-4 ${emAtraso > 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs text-slate-500">Em atraso pelo fornecedor</p>
          <p className={`text-xl font-semibold ${emAtraso > 0 ? "text-red-700" : "text-slate-900"}`}>{emAtraso}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Demandas Homologadas de Minha Competência</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Processo SEI (Licitação)</th>
              <th className="px-4 py-2 font-medium">Itens com Êxito</th>
              <th className="px-4 py-2 font-medium">Pendentes de Abertura</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {homologacoesDoSubperfil.map(({ cons }) => {
              const sucesso = [...cons.itensDfd, ...cons.itensTecnicos].filter((it) => it.resultadoHomologacao === "SUCESSO");
              const pendentes = sucesso.filter((it) => !it.processoExecucaoId);
              return (
                <tr key={cons.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-900">
                    <Link href={`/execucao/homologacao/${cons.id}`} className="block font-medium">
                      {cons.categoria.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{cons.processoSEI}</td>
                  <td className="px-4 py-2 text-slate-600">{sucesso.length}</td>
                  <td className="px-4 py-2">
                    {pendentes.length > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        {pendentes.length} pendente(s)
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Todos em execução</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/execucao/homologacao/${cons.id}`} className="text-xs text-slate-700 underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {homologacoesDoSubperfil.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma demanda homologada ainda enquadrada neste subperfil.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Meus Processos de Execução ({meusProcessos.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Processo SEI Execução</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Status Atual</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meusProcessos.map((p) => {
              const st = p.statusExecucao[0] ?? null;
              const atraso = calcularAtrasoExecucao(st?.status ?? null, st?.dataEnvio ?? null, st?.prazoDias ?? null);
              return (
                <tr key={p.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-900">
                    <Link href={`/execucao/${p.id}`} className="block font-medium">
                      {p.processoSEIExecucao}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.itensDfd.length + p.itensTecnicos.length}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                      {statusExecucaoLabel(st?.status ?? null)}
                    </span>
                    {atraso && (
                      <span className="ml-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                        Em atraso pelo fornecedor
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/execucao/${p.id}`} className="text-xs text-slate-700 underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {meusProcessos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Nenhum processo de execução aberto ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
