import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";

const STATUS_DOCUMENTO_LABEL: Record<"RASCUNHO" | "FINALIZADO", string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
};

export default async function AgenteContratacaoHomePage() {
  const consolidacoes = await prisma.consolidacaoTecnica.findMany({
    include: {
      categoria: true,
      setorTecnico: true,
      termoReferencia: true,
      minutaEdital: true,
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
      <h1 className="text-lg font-semibold text-slate-900">Agente de Contratação</h1>
      <p className="text-sm text-slate-500">
        Elaboração da Minuta de Edital — só pode ser iniciada depois que o Termo de Referência da
        consolidação estiver finalizado.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Setor Técnico</th>
              <th className="px-4 py-2 font-medium">Processo SEI</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor Estimado</th>
              <th className="px-4 py-2 font-medium">Termo de Referência</th>
              <th className="px-4 py-2 font-medium">Minuta de Edital</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consolidacoes.map((c) => {
              const trFinalizado = c.termoReferencia?.status === "FINALIZADO";
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-900">
                    <Link href={`/agente-contratacao/${c.id}`} className="block">
                      {c.categoria.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.setorTecnico.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{c.processoSEI}</td>
                  <td className="px-4 py-2 text-slate-600">{c.itensDfd.length + c.itensTecnicos.length}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(total(c))}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${trFinalizado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {trFinalizado ? "Finalizado" : c.termoReferencia ? "Rascunho" : "Não iniciado"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {c.minutaEdital ? (
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          c.minutaEdital.status === "FINALIZADO"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_DOCUMENTO_LABEL[c.minutaEdital.status]}
                      </span>
                    ) : trFinalizado ? (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        Pronta para iniciar
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                        Aguardando Termo de Referência
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/agente-contratacao/${c.id}`} className="text-xs text-slate-700 underline">
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
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
