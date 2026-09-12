import { prisma } from "@/lib/prisma";
import { criarItemCatalogoAction, excluirItemCatalogoAction } from "@/lib/actions/admin";
import { importarItensCatalogoAction } from "@/lib/actions/importacao";
import { brl } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import ImportarPlanilhaForm from "../ImportarPlanilhaForm";
import BotaoExcluir from "../BotaoExcluir";

export default async function CatalogoPage() {
  const [itens, categorias] = await Promise.all([
    prisma.itemCatalogo.findMany({
      include: { categoria: true },
      orderBy: [{ categoria: { nome: "asc" } }, { item: "asc" }],
    }),
    prisma.categoria.findMany({ where: { semItem: false }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Catálogo de itens</h1>

      <FormularioSimples
        action={criarItemCatalogoAction}
        titulo="Novo item de catálogo"
        campos={[
          {
            name: "categoriaId",
            label: "Categoria",
            required: true,
            options: categorias.map((c) => ({ value: c.id, label: c.nome })),
          },
          { name: "item", label: "Nome do item", required: true },
          { name: "valor", label: "Valor unitário (R$)", type: "number", required: true },
          {
            name: "tipoBem",
            label: "Tipo de bem",
            options: [
              { value: "PERMANENTE", label: "Permanente" },
              { value: "CONSUMO", label: "Consumo" },
            ],
          },
        ]}
      />

      <ImportarPlanilhaForm
        action={importarItensCatalogoAction}
        titulo="Importar itens de catálogo em lote (planilha)"
        colunas={["categoria (nome exato já cadastrado)", "item", "valor", "tipoBem (PERMANENTE/CONSUMO)"]}
        modeloHref="/modelos/catalogo.csv"
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itens.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2 text-slate-600">{it.categoria.nome}</td>
                <td className="px-4 py-2 text-slate-900">{it.item}</td>
                <td className="px-4 py-2 text-slate-600">{brl(it.valor)}</td>
                <td className="px-4 py-2 text-slate-600">
                  {it.tipoBem === "CONSUMO" ? "Consumo" : "Permanente"}
                </td>
                <td className="px-4 py-2">
                  <BotaoExcluir action={excluirItemCatalogoAction} id={it.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
