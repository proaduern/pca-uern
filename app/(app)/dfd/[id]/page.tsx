import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { brl, formatarData, formatarDataHora } from "@/lib/formato";
import { categoriaVisivelPara, itemCatalogoVisivelPara } from "@/lib/visibilidade";
import { resolverFaseItemDfd } from "@/lib/fase-item";
import { numeroFormatado } from "@/lib/pdf/dfd-dados";
import DadosGeraisForm from "./DadosGeraisForm";
import ItemForm from "./ItemForm";
import AcoesDfd from "./AcoesDfd";
import RemoverItemBotao from "./RemoverItemBotaoClient";
import ItemFaseDetalhe from "./ItemFaseDetalhe";
import TrocaOPPainel from "./TrocaOPPainel";

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
    include: {
      itens: { include: { categoria: true, trocaOP: true }, orderBy: { createdAt: "asc" } },
      unidade: true,
      setorInterno: true,
    },
  });
  if (!dfd) notFound();

  if (sessao.tipo === "UNIDADE" && dfd.unidadeId !== sessao.id) notFound();
  if (sessao.tipo === "SETOR_INTERNO" && dfd.setorInternoId !== sessao.id) notFound();

  const editavel = dfd.status === "RASCUNHO" || dfd.status === "REPROVADO";
  const modoAdmin = sessao.tipo === "ADMIN";
  const modoUnidade = sessao.tipo === "UNIDADE";
  const modoSetorInterno = sessao.tipo === "SETOR_INTERNO";
  // Uma vez enviado para a unidade revisar, o setor interno perde a edição
  // até ela reabrir (reabrirParaSetorAction) — ver obterDfdParaEdicaoOuErro.
  const bloqueadoParaSetor = modoSetorInterno && !!dfd.enviadoParaUnidadeEm;
  const podeEditarAutor = editavel && (modoUnidade || (modoSetorInterno && !bloqueadoParaSetor));
  // A PROAD pode editar o DFD em qualquer status — uma edição em um DFD já
  // aprovado o devolve para "aguardando aprovação" (ver reverterAprovacaoSeNecessario).
  const podeEditar = podeEditarAutor || modoAdmin;

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

  const fasesPorItem =
    dfd.status === "APROVADO"
      ? Object.fromEntries(await Promise.all(dfd.itens.map(async (it) => [it.id, await resolverFaseItemDfd(it.id)] as const)))
      : {};

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {dfd.descricaoSumaria || "Novo DFD"}
        </h1>
        <p className="text-xs text-slate-400">DFD nº {numeroFormatado(dfd)}</p>
        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {dfd.status}
        </span>
        {dfd.status === "REPROVADO" && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            Reprovado pela PROAD. Motivo: {dfd.motivoReprovacao}. Ajuste o que for necessário e
            reenvie.
          </p>
        )}
        {(modoUnidade || modoAdmin) && dfd.setorInterno && (
          <p className="mt-1 text-xs text-slate-500">
            DFD gerado na Unidade {dfd.unidade.nome}, por setor interno {dfd.setorInterno.nome}
          </p>
        )}
      </div>

      {modoAdmin && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Você está editando como PROAD. Se este DFD já estiver aprovado, qualquer alteração o
          devolve para &quot;aguardando aprovação&quot;.
        </p>
      )}

      <DadosGeraisForm
        dfd={{
          id: dfd.id,
          ano: dfd.ano,
          descricaoSumaria: dfd.descricaoSumaria,
          tipificacaoId: dfd.tipificacaoId,
          prioridadeId: dfd.prioridadeId,
          justificativa: dfd.justificativa,
          tipoDemanda: dfd.tipoDemanda,
          dataRenovacao: dfd.dataRenovacao,
          dataEntrega: dfd.dataEntrega,
        }}
        tipificacoes={tipificacoes}
        prioridades={prioridades}
        podeEditar={podeEditar}
        modoAdmin={modoAdmin}
      />

      <section className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
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
                {it.enquadramento === "RECURSOS_EXTRA" && (
                  <p className="text-xs text-slate-500">
                    Agência: {it.recursoExtraAgencia} · Conta: {it.recursoExtraConta}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap font-mono text-xs italic text-slate-500">
                  {it.correlacao}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{brl(it.valorTotal)}</p>
                {podeEditar && (
                  <RemoverItemBotao dfdId={dfd.id} itemId={it.id} modoAdmin={modoAdmin} />
                )}
              </div>
            </div>
            {fasesPorItem[it.id] && sessao.tipo === "UNIDADE" && (
              <>
                <ItemFaseDetalhe itemId={it.id} fase={fasesPorItem[it.id]} />
                {it.enquadramento === "OP" && it.tipo === "MATERIAL" && !fasesPorItem[it.id].executado && (
                  <TrocaOPPainel
                    itemDfdId={it.id}
                    itemNome={it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)"}
                    valorAtual={Number(it.valorTotal)}
                    trocaOP={
                      it.trocaOP
                        ? { status: it.trocaOP.status, itemBNome: it.trocaOP.itemBNome, motivo: it.trocaOP.analiseProadInicialMotivo ?? it.trocaOP.analiseProadFinalMotivo ?? null }
                        : null
                    }
                    categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
                    itensCatalogo={itensCatalogo.map((c) => ({ id: c.id, item: c.item, categoriaNome: c.categoria.nome, valor: Number(c.valor) }))}
                  />
                )}
              </>
            )}
          </div>
        ))}

        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
          Total: {brl(total)}
        </div>

        {podeEditar && (
          <ItemForm
            dfdId={dfd.id}
            categorias={categorias.map((c) => ({
              id: c.id,
              nome: c.nome,
              tipo: c.tipo,
              semItem: c.semItem,
              modoServico: c.modoServico,
            }))}
            itensCatalogo={itensCatalogo.map((it) => ({
              id: it.id,
              categoriaId: it.categoriaId,
              item: it.item,
              valor: Number(it.valor),
            }))}
            unidadeElegivelOP={dfd.unidade.elegivelCotaOP}
            modoAdmin={modoAdmin}
          />
        )}
      </section>

      {dfd.itens.length > 0 && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <a
            href={`/dfd/${dfd.id}/pdf`}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Baixar DFD (PDF)
          </a>
          <a
            href={`/dfd/${dfd.id}/itens-xlsx`}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Baixar itens (XLSX)
          </a>
        </div>
      )}

      {(modoUnidade || modoSetorInterno) && (
        <AcoesDfd
          dfdId={dfd.id}
          podeEditar={podeEditarAutor}
          totalItens={dfd.itens.length}
          papel={modoSetorInterno ? "SETOR_INTERNO" : "UNIDADE"}
          mensagemBloqueio={
            bloqueadoParaSetor
              ? `Enviado para revisão da unidade em ${formatarDataHora(dfd.enviadoParaUnidadeEm!)}. Aguarde a liberação para a PROAD.`
              : undefined
          }
          podeReabrirParaSetor={modoUnidade && !!dfd.setorInternoId && !!dfd.enviadoParaUnidadeEm && editavel}
        />
      )}

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
