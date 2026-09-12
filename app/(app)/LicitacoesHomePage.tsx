import { prisma } from "@/lib/prisma";
import { brl, formatarData } from "@/lib/formato";

const PRIORIDADE_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };
const TIPO_CONTRATACAO_LABEL: Record<string, string> = {
  NORMAL: "Contratação Normal",
  ATA: "Ata de Registro de Preços",
};

export default async function LicitacoesHomePage() {
  const consolidacoes = await prisma.consolidacaoTecnica.findMany({
    include: {
      categoria: true,
      setorTecnico: true,
      itensDfd: { include: { dfd: { include: { unidade: true } } } },
      itensTecnicos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const total = (c: (typeof consolidacoes)[number]) =>
    c.itensDfd.reduce((s, it) => s + Number(it.valorTotal), 0) +
    c.itensTecnicos.reduce((s, it) => s + Number(it.valorTotal), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Processos Consolidados pelos Setores Técnicos</h1>
      <p className="text-sm text-slate-500">
        Todos os processos consolidados, de todas as categorias e setores técnicos. A gestão do
        andamento da licitação (status, homologação) ainda não foi implementada nesta fase.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Setor Técnico</th>
              <th className="px-4 py-2 font-medium">Processo SEI</th>
              <th className="px-4 py-2 font-medium">Prioridade</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Conclusão Esperada</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consolidacoes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-slate-900">{c.categoria.nome}</td>
                <td className="px-4 py-2 text-slate-600">{c.setorTecnico.nome}</td>
                <td className="px-4 py-2 text-slate-600">{c.processoSEI}</td>
                <td className="px-4 py-2 text-slate-600">{PRIORIDADE_LABEL[c.prioridade]}</td>
                <td className="px-4 py-2 text-slate-600">{TIPO_CONTRATACAO_LABEL[c.tipoContratacao]}</td>
                <td className="px-4 py-2 text-slate-600">{formatarData(c.dataEsperadaConclusao)}</td>
                <td className="px-4 py-2 text-slate-600">{c.itensDfd.length + c.itensTecnicos.length}</td>
                <td className="px-4 py-2 text-slate-600">{brl(total(c))}</td>
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
