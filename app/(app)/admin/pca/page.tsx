import { prisma } from "@/lib/prisma";
import { criarOuAtualizarPcaAction, adicionarExcecaoPcaAction } from "@/lib/actions/admin";
import { brl, formatarData } from "@/lib/formato";
import {
  compilarLinhasPcaAno,
  totaisConsolidado,
  type LinhaCompiladaPca,
} from "@/lib/pca-consolidado";
import FormularioSimples from "../FormularioSimples";
import PcaAcoes from "./PcaAcoes";
import CodigoPcaInput from "./CodigoPcaInput";
import CodigoPncpLinhaCompiladaInput from "./CodigoPncpLinhaCompiladaInput";
import { exigirAdminNaPagina } from "@/lib/auth";

function TabelaBlocoCompilado({
  titulo,
  subtitulo,
  linhas,
  ano,
  mostrarColunaCategoriaBase = false,
}: {
  titulo: string;
  subtitulo: string;
  linhas: LinhaCompiladaPca[];
  ano: number;
  mostrarColunaCategoriaBase?: boolean;
}) {
  if (linhas.length === 0) return null;
  const totaisBloco = totaisConsolidado(linhas);
  const comPncp = linhas.filter((l) => !!l.codigoPncp?.trim()).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#003366]">
            {titulo} ({linhas.length} {linhas.length === 1 ? "linha" : "linhas"})
          </h3>
          <p className="text-[11px] text-slate-500">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
            Subtotal: <strong>{brl(totaisBloco.total)}</strong>
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 font-semibold ${
              comPncp === linhas.length
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {comPncp}/{linhas.length} com ID PNCP
          </span>
        </div>
      </div>

      <div className="max-h-[36rem] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600 shadow-xs">
            <tr>
              <th className="px-2.5 py-2 font-medium">#</th>
              <th className="px-2.5 py-2 font-medium">Classificação / Rubrica</th>
              <th className="px-2.5 py-2 font-medium">Modalidade</th>
              {mostrarColunaCategoriaBase && (
                <th className="px-2.5 py-2 font-medium">Categoria</th>
              )}
              <th className="px-2.5 py-2 font-medium">
                {mostrarColunaCategoriaBase
                  ? "Objeto / Demanda Compilada (1 Linha por DFD)"
                  : "Categoria / Grupo Compilado"}
              </th>
              <th className="px-2.5 py-2 font-medium">Origem / Setor</th>
              <th className="px-2.5 py-2 text-right font-medium">Convênios</th>
              <th className="px-2.5 py-2 text-right font-medium">Outras Fontes</th>
              <th className="px-2.5 py-2 text-right font-medium">Fonte 500</th>
              <th className="px-2.5 py-2 text-right font-medium">TOTAL</th>
              <th className="px-2.5 py-2 font-medium">ID do PNCP ({ano})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map((l, idx) => (
              <tr
                key={l.chave}
                className={!l.codigoPncp?.trim() ? "bg-amber-50/40" : "hover:bg-slate-50"}
              >
                <td className="px-2.5 py-2 text-slate-400">{idx + 1}</td>
                <td className="px-2.5 py-2 text-[11px] text-slate-600 max-w-[14rem]">
                  {l.classificacaoRubrica}
                </td>
                <td className="px-2.5 py-2 text-slate-600 whitespace-nowrap">
                  {l.modalidade}
                </td>
                {mostrarColunaCategoriaBase && (
                  <td className="px-2.5 py-2 text-slate-700 font-medium">
                    {l.categoriaBaseNome}
                  </td>
                )}
                <td className="px-2.5 py-2 font-semibold text-slate-900 max-w-[24rem]">
                  {l.objetoOuGrupoNome}
                </td>
                <td className="px-2.5 py-2 text-[11px] text-slate-600">
                  <div>
                    {l.qtdDfds} {l.qtdDfds === 1 ? "DFD" : "DFDs"} ({l.qtdItens}{" "}
                    {l.qtdItens === 1 ? "item" : "itens"})
                  </div>
                  <div className="text-slate-400">
                    {mostrarColunaCategoriaBase ? l.unidadeResumo : l.setorTecnicoNome}
                  </div>
                </td>
                <td className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap">
                  {brl(l.convenio)}
                </td>
                <td className="px-2.5 py-2 text-right text-slate-600 whitespace-nowrap">
                  {brl(l.recursosExtra)}
                </td>
                <td className="px-2.5 py-2 text-right text-slate-700 whitespace-nowrap">
                  {brl(l.fonte500)}
                </td>
                <td className="px-2.5 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                  {brl(l.total)}
                </td>
                <td className="px-2.5 py-2">
                  <CodigoPncpLinhaCompiladaInput
                    itensDfdIds={l.itensDfdIds}
                    categoriaIdPrincipal={l.categoriaIdPrincipal}
                    ehAgrupadoPorCategoria={l.ehAgrupadoPorCategoria}
                    valorInicial={l.codigoPncp ?? ""}
                    ano={ano}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function PcaPage() {
  await exigirAdminNaPagina();
  const [pcas, unidades, consolidacoes, todosItensDfd, contagemDfdsPorAnoStatus] =
    await Promise.all([
      prisma.pca.findMany({ orderBy: { ano: "desc" }, include: { excecoes: true } }),
      prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
      prisma.consolidacaoTecnica.findMany({ include: { categoria: true } }),
      prisma.itemDfd.findMany({
        where: {
          dfd: { status: { in: ["APROVADO", "AGUARDANDO_APROVACAO"] } },
          categoria: { ativa: true, ignoraPCA: false, fluxoContinuo: false },
        },
        include: {
          categoria: { include: { setorTecnico: { select: { nome: true } } } },
          dfd: { include: { unidade: { select: { nome: true } } } },
          consolidacaoTecnica: { select: { codigoPca: true } },
        },
      }),
      prisma.dfd.groupBy({
        by: ["ano", "status"],
        _count: { _all: true },
      }),
    ]);

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? id;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        PCA — Plano de Contratações Anual (Compilação e Prévia Consolidada)
      </h1>

      <FormularioSimples
        action={criarOuAtualizarPcaAction}
        titulo="Cadastrar/atualizar PCA de um ano"
        campos={[
          { name: "ano", label: "Ano", type: "number", required: true },
          { name: "cotaGeral", label: "Cota Geral (R$)", type: "number", step: "0.01", required: true },
          { name: "cotaOP", label: "Cota OP (R$)", type: "number", step: "0.01", required: true },
          { name: "dataAbertura", label: "Data de abertura", type: "date", required: true },
          { name: "dataFechamento", label: "Data de fechamento", type: "date", required: true },
        ]}
      />

      {pcas.map((pca) => {
        const dfdsAprovadosCount =
          contagemDfdsPorAnoStatus.find((x) => x.ano === pca.ano && x.status === "APROVADO")
            ?._count._all ?? 0;
        const dfdsAguardandoCount =
          contagemDfdsPorAnoStatus.find(
            (x) => x.ano === pca.ano && x.status === "AGUARDANDO_APROVACAO",
          )?._count._all ?? 0;

        // Se todos ou parte dos DFDs já estão aprovados e não há mais aguardando, compila só APROVADO;
        // enquanto ainda houver DFDs em AGUARDANDO_APROVACAO, exibe a prévia completa (APROVADO + AGUARDANDO_APROVACAO)
        const itensDoAno = todosItensDfd.filter((it) => it.dfd.ano === pca.ano);
        const linhasCompiladas = compilarLinhasPcaAno(
          itensDoAno.map((it) => ({
            id: it.id,
            dfdId: it.dfdId,
            dfdDescricaoSumaria: it.dfd.descricaoSumaria,
            dfdIdSeiOrigem: it.idSeiDfdOrigem ?? it.dfd.idSeiDfdOrigem,
            dfdProcessoSeiOrigem: it.processoSeiOrigem ?? it.dfd.processoSeiOrigem,
            dfdTipoDemanda: it.dfd.tipoDemanda,
            dfdStatus: it.dfd.status,
            unidadeNome: it.dfd.unidade.nome,
            categoriaId: it.categoriaId,
            categoriaNome: it.categoria.nome,
            categoriaTipo: it.categoria.tipo,
            categoriaClassificacaoRubrica: it.categoria.classificacaoRubrica,
            categoriaConsolidarPorObjeto: it.categoria.consolidarPorObjeto,
            categoriaCodigoPcaPadrao: it.categoria.codigoPcaPadrao,
            setorTecnicoId: it.categoria.setorTecnicoId,
            setorTecnicoNome: it.categoria.setorTecnico?.nome ?? "Sem setor vinculado",
            enquadramento: it.enquadramento,
            valorTotal: Number(it.valorTotal),
            codigoPncpReferencia: it.codigoPncpReferencia,
            consolidacaoCodigoPca: it.consolidacaoTecnica?.codigoPca ?? null,
          })),
        );

        const totaisAno = totaisConsolidado(linhasCompiladas);
        const bloco1Materiais = linhasCompiladas.filter(
          (l) => l.bloco === "MATERIAIS_AGRUPADOS",
        );
        const bloco2ServicosAgrupados = linhasCompiladas.filter(
          (l) => l.bloco === "SERVICOS_AGRUPADOS",
        );
        const bloco3PorDemanda = linhasCompiladas.filter(
          (l) => l.bloco === "SERVICOS_E_OBRAS_POR_DEMANDA",
        );

        const pendentesPncp = linhasCompiladas.filter((l) => !l.codigoPncp?.trim());
        const comPncp = linhasCompiladas.filter((l) => !!l.codigoPncp?.trim());

        return (
          <div
            key={pca.ano}
            className="space-y-5 rounded-2xl border border-slate-100 bg-white shadow-sm p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  PCA {pca.ano}{" "}
                  {pca.ativo && <span className="text-emerald-600">(Ativo)</span>} —
                  Compilação e Prévia do Plano de Contratações Anual
                </h2>
                <p className="text-xs text-slate-500">
                  Status dos DFDs Primários:{" "}
                  <strong className="text-emerald-700">
                    {dfdsAprovadosCount} aprovado(s)
                  </strong>{" "}
                  •{" "}
                  <strong
                    className={
                      dfdsAguardandoCount > 0 ? "text-amber-700" : "text-slate-600"
                    }
                  >
                    {dfdsAguardandoCount} aguardando aprovação
                  </strong>{" "}
                  • Total compilado no PCA {pca.ano}:{" "}
                  <strong>{linhasCompiladas.length} linhas</strong>
                </p>
              </div>
              {linhasCompiladas.length > 0 && (
                <div className="flex items-center gap-2">
                  <a
                    href={`/admin/pca/${pca.ano}/consolidado-pdf`}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Baixar PCA Consolidado (PDF)
                  </a>
                  <a
                    href={`/admin/pca/${pca.ano}/consolidado-xlsx`}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Baixar PCA Consolidado (XLSX)
                  </a>
                </div>
              )}
            </div>

            {/* Cards de Resumo Orçamentário e Compilação por Fonte */}
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs text-slate-500">Convênios</p>
                <p className="text-base font-bold text-slate-900">
                  {brl(totaisAno.convenio)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs text-slate-500">Outras Fontes (Unidade)</p>
                <p className="text-base font-bold text-slate-900">
                  {brl(totaisAno.recursosExtra)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs text-slate-500">Fonte 500 (Geral + OP)</p>
                <p className="text-base font-bold text-slate-900">
                  {brl(totaisAno.fonte500)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Teto Cota Geral: {brl(pca.cotaGeral)} (OP: {brl(pca.cotaOP)})
                </p>
              </div>
              <div className="rounded-xl border border-[#003366]/20 bg-blue-50/50 p-3">
                <p className="text-xs font-medium text-[#003366]">
                  TOTAL COMPILADO PCA {pca.ano}
                </p>
                <p className="text-base font-black text-[#003366]">
                  {brl(totaisAno.total)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Janela: {formatarData(pca.dataAbertura)} a{" "}
                  {formatarData(pca.dataFechamento)}
                </p>
              </div>
            </div>

            {linhasCompiladas.length > 0 && (
              <div
                className={`rounded-xl border p-3.5 text-xs ${
                  pendentesPncp.length > 0
                    ? "border-amber-300 bg-amber-50/80 text-amber-950"
                    : "border-emerald-300 bg-emerald-50/70 text-emerald-950"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">
                    {pendentesPncp.length > 0
                      ? `⚠️ Atenção — Faltam ${pendentesPncp.length} linha(s) compilada(s) sem ID do PNCP lançado no PCA ${pca.ano}`
                      : `✓ Todas as ${linhasCompiladas.length} linhas compiladas do PCA ${pca.ano} possuem ID do PNCP lançado`}
                  </p>
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 font-semibold">
                    {comPncp.length} de {linhasCompiladas.length} linhas com ID PNCP
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">
                  <strong>Fluxo de Compilação do PCA {pca.ano}:</strong> Os DFDs são
                  aprovados sem exigir ID do PNCP. Após a aprovação, esta tela compila
                  automaticamente o PCA em 3 blocos: <strong>(I)</strong> Aquisições de
                  Bens e Materiais agrupados por categoria, <strong>(II)</strong> Serviços
                  agrupados para fins de PCA e <strong>(III)</strong> Serviços por Objeto
                  e Obras separados por demanda/DFD. O ID do PNCP é lançado por linha
                  abaixo antes da conclusão do PCA {pca.ano}.
                </p>
              </div>
            )}

            <PcaAcoes
              pca={{
                ano: pca.ano,
                ativo: pca.ativo,
                aberturaExtraGeral: pca.aberturaExtraGeral,
                concluido: pca.concluido,
                cotaGeral: Number(pca.cotaGeral),
                cotaOP: Number(pca.cotaOP),
                dataAberturaIso: pca.dataAbertura
                  ? new Date(pca.dataAbertura).toISOString().slice(0, 10)
                  : "",
                dataFechamentoIso: pca.dataFechamento
                  ? new Date(pca.dataFechamento).toISOString().slice(0, 10)
                  : "",
                dfdsAguardandoAprovacao: dfdsAguardandoCount,
              }}
            />

            {/* BLOCO I: Aquisições de Bens e Materiais (Agrupados por Categoria) */}
            <TabelaBlocoCompilado
              titulo="Bloco I — Aquisições de Bens e Materiais (Agrupados por Categoria)"
              subtitulo="Todas as compras de bens e materiais dos DFDs são somadas em uma única linha por categoria."
              linhas={bloco1Materiais}
              ano={pca.ano}
              mostrarColunaCategoriaBase={false}
            />

            {/* BLOCO II: Serviços Agrupados para fins de PCA */}
            <TabelaBlocoCompilado
              titulo="Bloco II — Serviços Agrupados para Fins de PCA"
              subtitulo="Serviços agrupados em uma linha única (Serviços Gráficos, Serigráficos, Coffee Break, Tendas, Veste Talar, Cerimoniais, Locação de Palco/Estrutura de Eventos, Diagramação de E-book FACEM/Natal, Passagens Aéreas + Emissão de Bilhetes, Hospedagens + Agenciamento e Manutenção Predial)."
              linhas={bloco2ServicosAgrupados}
              ano={pca.ano}
              mostrarColunaCategoriaBase={false}
            />

            {/* BLOCO III: Serviços por Objeto e Obras Separados por Demanda / DFD */}
            <TabelaBlocoCompilado
              titulo="Bloco III — Serviços por Objeto e Obras (Separados por Demanda / DFD)"
              subtitulo="Cada DFD aprovado representa uma linha própria no PCA Consolidado (Obras e Reformas, Engenharia/Arquitetura, Serviços de TI, Locação de Imóvel, Mobília Planejada, Taxas/Associações, Concessões não Onerosas, Softwares, TV/Rádio, Eventos específicos, Estande GO!RN, Impressão/OMP/Periódicos e demais serviços por objeto)."
              linhas={bloco3PorDemanda}
              ano={pca.ano}
              mostrarColunaCategoriaBase={true}
            />

            {consolidacoes.some((c) => c.pcaAno === pca.ano) && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">
                  Processos de Consolidação Técnica já abertos pelos Setores Técnicos neste PCA
                </p>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Categoria</th>
                        <th className="px-3 py-1.5 font-medium">Processo SEI</th>
                        <th className="px-3 py-1.5 font-medium">Código PCA / ID PNCP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consolidacoes
                        .filter((c) => c.pcaAno === pca.ano)
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="px-3 py-1.5 text-slate-900">
                              {c.categoria?.nome ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">{c.processoSEI}</td>
                            <td className="px-3 py-1.5">
                              <CodigoPcaInput
                                consolidacaoId={c.id}
                                valorInicial={c.codigoPca ?? ""}
                                desabilitado={false}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">
                Exceções (unidades com abertura extra individual)
              </p>
              <ul className="mb-2 space-y-1 text-sm text-slate-600">
                {pca.excecoes.map((e) => (
                  <li key={e.id}>{nomeUnidade(e.unidadeId)}</li>
                ))}
                {pca.excecoes.length === 0 && <li className="text-slate-400">Nenhuma.</li>}
              </ul>
              <form action={adicionarExcecaoPcaAction} className="flex items-center gap-2">
                <input type="hidden" name="ano" value={pca.ano} />
                <select
                  name="unidadeId"
                  required
                  className="rounded-xl border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="">Selecione a unidade...</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244]">
                  Adicionar exceção
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
