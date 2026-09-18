import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl, formatarData } from "@/lib/formato";

const STATUS_DOCUMENTO_LABEL: Record<"RASCUNHO" | "FINALIZADO", string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
};

export default async function PesquisaPrecosHomePage() {
  const consolidacoes = await prisma.consolidacaoTecnica.findMany({
    include: {
      categoria: true,
      setorTecnico: true,
      pesquisaDePrecos: true,
      itensDfd: { select: { valorTotal: true } },
      itensTecnicos: { select: { valorTotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = (c: (typeof consolidacoes)[number]) =>
    c.itensDfd.reduce((s, it) => s + Number(it.valorTotal), 0) +
    c.itensTecnicos.reduce((s, it) => s + Number(it.valorTotal), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Pesquisa de Preços</h1>
      <p className="text-sm text-slate-500">
        Todas as consolidações, de todas as categorias e setores técnicos — escolha uma para
        iniciar ou continuar a pesquisa de preços.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Setor Técnico</th>
              <th className="px-4 py-2 font-medium">Processo SEI</th>
              <th className="px-4 py-2 font-medium">Data ETP</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor Estimado (ETP)</th>
              <th className="px-4 py-2 font-medium">Pesquisa de Preços</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consolidacoes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-900">
                  <Link href={`/pesquisa-precos/${c.id}`} className="block">
                    {c.categoria.nome}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{c.setorTecnico.nome}</td>
                <td className="px-4 py-2 text-slate-600">{c.processoSEI}</td>
                <td className="px-4 py-2 text-slate-600">{formatarData(c.dataETP)}</td>
                <td className="px-4 py-2 text-slate-600">{c.itensDfd.length + c.itensTecnicos.length}</td>
                <td className="px-4 py-2 text-slate-600">{brl(total(c))}</td>
                <td className="px-4 py-2">
                  {c.pesquisaDePrecos ? (
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        c.pesquisaDePrecos.status === "FINALIZADO"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATUS_DOCUMENTO_LABEL[c.pesquisaDePrecos.status]}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                      Não iniciada
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/pesquisa-precos/${c.id}`} className="text-xs text-slate-700 underline">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {consolidacoes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma consolidação recebida ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
