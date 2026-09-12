import { prisma } from "@/lib/prisma";
import { criarCategoriaAction, excluirCategoriaAction } from "@/lib/actions/admin";
import { importarCategoriasAction } from "@/lib/actions/importacao";
import { brl } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import ImportarPlanilhaForm from "../ImportarPlanilhaForm";
import BotaoExcluir from "../BotaoExcluir";
import AtribuirSetorForm from "./AtribuirSetorForm";
import RestricaoCategoriaForm from "./RestricaoCategoriaForm";

export default async function CategoriasPage() {
  const [categorias, setores, unidades] = await Promise.all([
    prisma.categoria.findMany({
      include: { unidadesRestritas: { select: { id: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.setorTecnico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Categorias</h1>
      <p className="text-sm text-slate-500">
        &quot;Sem item&quot; = categoria de material sem catálogo (demandante informa só o valor,
        ex.: obras). Categorias de serviço não usam catálogo, exceto no modo &quot;itens&quot;.
      </p>

      <FormularioSimples
        action={criarCategoriaAction}
        titulo="Nova categoria"
        campos={[
          { name: "nome", label: "Nome", required: true },
          {
            name: "tipo",
            label: "Tipo",
            required: true,
            options: [
              { value: "MATERIAL", label: "Material" },
              { value: "SERVICO", label: "Serviço" },
            ],
          },
          {
            name: "modoServico",
            label: "Modo de serviço (se aplicável)",
            options: [
              { value: "OBJETO", label: "Objeto livre (nunca agrupa)" },
              { value: "VALOR", label: "Apenas valor (agrupa por categoria)" },
              { value: "ITENS", label: "Com catálogo de itens (agrupa por item)" },
            ],
          },
          { name: "saldoAnualGlobal", label: "Teto anual global (R$, opcional)", type: "number" },
          { name: "semItem", label: "Material sem catálogo (valor livre)", checkbox: true },
          { name: "fluxoContinuo", label: "Fluxo contínuo (pula todo o pipeline após aprovação)", checkbox: true },
          { name: "dependeContrato", label: "Depende de contrato", checkbox: true },
          { name: "ignoraPCA", label: "Não consome o saldo geral do PCA", checkbox: true },
        ]}
      />

      <ImportarPlanilhaForm
        action={importarCategoriasAction}
        titulo="Importar categorias em lote (planilha)"
        colunas={[
          "nome",
          "tipo (MATERIAL/SERVICO)",
          "modoServico (OBJETO/VALOR/ITENS)",
          "semItem (sim/não)",
          "fluxoContinuo (sim/não)",
          "dependeContrato (sim/não)",
          "ignoraPCA (sim/não)",
          "saldoAnualGlobal",
        ]}
        modeloHref="/modelos/categorias.csv"
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Teto anual</th>
              <th className="px-4 py-2 font-medium">Flags</th>
              <th className="px-4 py-2 font-medium">Setor técnico</th>
              <th className="px-4 py-2 font-medium">Visibilidade</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-slate-900">{c.nome}</td>
                <td className="px-4 py-2 text-slate-600">
                  {c.tipo === "MATERIAL" ? "Material" : `Serviço (${c.modoServico})`}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {c.saldoAnualGlobal ? brl(c.saldoAnualGlobal) : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {[
                    c.semItem && "sem catálogo",
                    c.fluxoContinuo && "fluxo contínuo",
                    c.ignoraPCA && "fora do PCA",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td className="px-4 py-2">
                  <AtribuirSetorForm categoriaId={c.id} setorTecnicoId={c.setorTecnicoId} setores={setores} />
                </td>
                <td className="px-4 py-2">
                  <RestricaoCategoriaForm
                    categoriaId={c.id}
                    modoAtual={c.restricaoModo}
                    unidadesRestritasIds={c.unidadesRestritas.map((u) => u.id)}
                    unidades={unidades}
                  />
                </td>
                <td className="px-4 py-2">
                  <BotaoExcluir action={excluirCategoriaAction} id={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
