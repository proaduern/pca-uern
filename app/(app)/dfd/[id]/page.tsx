import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { brl, formatarData } from "@/lib/formato";
import { categoriaVisivelPara, itemCatalogoVisivelPara } from "@/lib/visibilidade";
import DadosGeraisForm from "./DadosGeraisForm";
import ItemForm from "./ItemForm";
import AcoesDfd from "./AcoesDfd";
import RemoverItemBotao from "./RemoverItemBotaoClient";

export default async function DfdDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao) return null;

  const dfd = await prisma.dfd.findUnique({
    where: { id },
    include: { itens: { include: { categoria: true }, orderBy: { createdAt: "asc" } }, unidade: true },
  });
  if (!dfd) notFound();

  if (sessao.tipo === "UNIDADE" && dfd.unidadeId !== sessao.id) notFound();

  const editavel = dfd.status === "RASCUNHO" || dfd.status === "REPROVADO";
  const podeEditar = editavel && sessao.tipo === "UNIDADE";

  const [tipificacoes, prioridades, todasCategorias, todosItensCatalogo] = await Promise.all([
    prisma.tipificacao.findMany({ orderBy: { nome: "asc" } }),
    prisma.prioridade.findMany({ orderBy: { frase: "asc" } }),
    prisma.categoria.findMany({
      where: { ativa: true },
      include: { unidadesRestritas: { select: { id: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.itemCatalogo.findMany({
      where: { ativo: true },
      include: { categoria: { include: { unidadesRestritas: { select: { id: true } } } }, unidadesRestritas: { select: { id: true } } },
    }),
  ]);

  const categorias = todasCategorias.filter((c) => categoriaVisivelPara(c, dfd.unidadeId));
  const itensCatalogo = todosItensCatalogo.filter(
    (it) => categoriaVisivelPara(it.categoria, dfd.unidadeId) && itemCatalogoVisivelPara(it, it.categoria, dfd.unidadeId),
  );

  const total = dfd.itens.reduce((s, it) => s + Number(it.valorTotal), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {dfd.descricaoSumaria || "Novo DFD"}
        </h1>
        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {dfd.status}
        </span>
        {dfd.status === "REPROVADO" && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Reprovado pela PROAD. Motivo: {dfd.motivoReprovacao}. Ajuste o que for necessário e
            reenvie.
          </p>
        )}
      </div>

      <DadosGeraisForm
        dfd={dfd}
        tipificacoes={tipificacoes}
        prioridades={prioridades}
        podeEditar={podeEditar}
      />

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Itens ({dfd.itens.length})</h2>

        {dfd.itens.map((it) => (
          <div key={it.id} className="rounded-md border border-slate-200 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">
                  {it.itemCatalogoNome || it.itemNomeLivre}
                </p>
                <p className="text-xs text-slate-500">
                  {it.categoria.nome} · {it.tipo === "MATERIAL" ? "Material" : "Serviço"} ·
                  Enquadramento: {it.enquadramento}
                  {it.quantidade ? ` · Qtd: ${it.quantidade}` : ""}
                </p>
                <p className="mt-1 text-xs italic text-slate-500">{it.correlacao}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{brl(it.valorTotal)}</p>
                {podeEditar && <RemoverItemBotao dfdId={dfd.id} itemId={it.id} />}
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
          Total: {brl(total)}
        </div>

        {podeEditar && (
          <ItemForm
            dfdId={dfd.id}
            categorias={categorias}
            itensCatalogo={itensCatalogo}
            unidadeElegivelOP={dfd.unidade.elegivelCotaOP}
          />
        )}
      </section>

      <AcoesDfd dfdId={dfd.id} podeEditar={podeEditar} totalItens={dfd.itens.length} />

      {dfd.dataRenovacao && (
        <p className="text-xs text-slate-400">
          Data prevista de renovação: {formatarData(dfd.dataRenovacao)}
        </p>
      )}
      {dfd.dataEntrega && (
        <p className="text-xs text-slate-400">
          Data pretendida de entrega: {formatarData(dfd.dataEntrega)}
        </p>
      )}
    </div>
  );
}
