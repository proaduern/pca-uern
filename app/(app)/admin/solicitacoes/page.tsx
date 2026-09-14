import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { exigirAdminNaPagina } from "@/lib/auth";
import RevisaoSolicitacaoForm from "./RevisaoSolicitacaoForm";

export default async function SolicitacoesCatalogoPage() {
  await exigirAdminNaPagina();

  const [pendentes, historico, categoriasExistentes] = await Promise.all([
    prisma.solicitacaoCatalogo.findMany({
      where: { status: "PENDENTE" },
      include: { unidade: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.solicitacaoCatalogo.findMany({
      where: { status: { not: "PENDENTE" } },
      include: { unidade: true, categoriaFinal: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.categoria.findMany({ where: { tipo: "MATERIAL" }, select: { nome: true }, orderBy: { nome: "asc" } }),
  ]);

  const nomesCategorias = categoriasExistentes.map((c) => c.nome);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Solicitações de Catálogo</h1>
      <p className="text-sm text-slate-500">
        Pedidos de inclusão de novo item no catálogo padronizado, enviados pelas unidades quando
        não encontram o material desejado ao lançar um DFD.
      </p>

      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Pendentes de Análise ({pendentes.length})
        </h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma solicitação pendente no momento.</p>
        ) : (
          pendentes.map((s) => (
            <RevisaoSolicitacaoForm
              key={s.id}
              solicitacao={s}
              unidade={s.unidade}
              categoriasExistentes={nomesCategorias}
            />
          ))
        )}
      </div>

      {historico.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Histórico de Solicitações ({historico.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Unidade</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Categoria/Item no catálogo</th>
                <th className="px-4 py-2 font-medium">Tipo de Bem</th>
                <th className="px-4 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historico.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-slate-900">{s.nomeResumido}</td>
                  <td className="px-4 py-2 text-slate-600">{s.unidade?.nome ?? "—"}</td>
                  <td className="px-4 py-2">
                    {s.status === "ACEITO" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                        Aceita
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                        Rejeitada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.status === "ACEITO"
                      ? `${s.categoriaFinal?.nome ?? "—"} / ${s.itemFinal}`
                      : s.motivoRejeicao || "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.status === "ACEITO" ? (s.tipoBemFinal === "CONSUMO" ? "Consumo" : "Permanente") : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.status === "ACEITO" && s.valorFinal != null ? brl(s.valorFinal) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
