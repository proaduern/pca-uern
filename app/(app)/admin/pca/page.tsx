import { prisma } from "@/lib/prisma";
import { criarOuAtualizarPcaAction, adicionarExcecaoPcaAction } from "@/lib/actions/admin";
import { brl, formatarData } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import PcaAcoes from "./PcaAcoes";
import CodigoPcaInput from "./CodigoPcaInput";
import CodigoPcaCategoriaInput from "./CodigoPcaCategoriaInput";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function PcaPage() {
  await exigirAdminNaPagina();
  const [pcas, unidades, consolidacoes, categoriasComDemanda] = await Promise.all([
    prisma.pca.findMany({ orderBy: { ano: "desc" }, include: { excecoes: true } }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
    prisma.consolidacaoTecnica.findMany({ include: { categoria: true } }),
    prisma.categoria.findMany({
      where: { ativa: true, ignoraPCA: false },
      include: {
        setorTecnico: { select: { nome: true } },
        itensDfd: {
          include: {
            dfd: { select: { ano: true, status: true } },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? id;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        PCA — Plano de Contratações Anual
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
        const catsDoAno = categoriasComDemanda
          .map((cat) => {
            const itensDoAno = cat.itensDfd.filter(
              (it) =>
                it.dfd.ano === pca.ano &&
                (it.dfd.status === "AGUARDANDO_APROVACAO" || it.dfd.status === "APROVADO"),
            );
            const valorTotal = itensDoAno.reduce((s, it) => s + Number(it.valorTotal), 0);
            const codItem = itensDoAno.find((it) => it.codigoPncpReferencia)?.codigoPncpReferencia ?? null;
            return {
              id: cat.id,
              nome: cat.nome,
              setorNome: cat.setorTecnico?.nome ?? "Sem setor vinculado",
              consolidarPorObjeto: cat.consolidarPorObjeto,
              codigoPcaPadrao: cat.codigoPcaPadrao ?? codItem ?? "",
              qtdItens: itensDoAno.length,
              valorTotal,
            };
          })
          .filter((c) => c.qtdItens > 0);

        const pendentesPncp = catsDoAno.filter((c) => !c.codigoPcaPadrao.trim());
        const comPncp = catsDoAno.filter((c) => !!c.codigoPcaPadrao.trim());

        return (
          <div key={pca.ano} className="space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                PCA {pca.ano} {pca.ativo && <span className="text-emerald-600">(ativo)</span>}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Cota Geral</p>
                <p>{brl(pca.cotaGeral)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cota OP</p>
                <p>{brl(pca.cotaOP)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Janela</p>
                <p>
                  {formatarData(pca.dataAbertura)} a {formatarData(pca.dataFechamento)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p>
                  {pca.concluido
                    ? `Concluído em ${formatarData(pca.concluidoEm)}`
                    : "Em andamento"}
                </p>
              </div>
            </div>

            {catsDoAno.length > 0 && (
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
                      ? `⚠️ Atenção — Faltam ${pendentesPncp.length} categoria(s) sem ID do PNCP lançado no PCA ${pca.ano}`
                      : `✓ Todas as ${catsDoAno.length} categorias de contratação do PCA ${pca.ano} possuem ID do PNCP lançado`}
                  </p>
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 font-semibold">
                    {comPncp.length} de {catsDoAno.length} com ID PNCP
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">
                  <strong>Regra de Governança do PCA:</strong> O PCA {pca.ano} só pode ser concluído e seguir para as demais fases
                  (<strong>Setores Técnicos, DFD Consolidado, ETP, Mapa de Riscos e IMR</strong>) depois que{" "}
                  <strong>todos os IDs do PNCP (ex.: 925543-XX/{pca.ano})</strong> estiverem devidamente lançados abaixo.
                  Onde não houve ID do PNCP encontrado na planilha/portal, o campo foi mantido em branco para preenchimento.
                </p>
                {pendentesPncp.length > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-amber-900">
                    <strong>Categorias aguardando inclusão do ID PNCP:</strong>{" "}
                    {pendentesPncp.map((c) => c.nome).join(" • ")}
                  </p>
                )}
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
              }}
            />

            {/* Tabela de todas as categorias com demandas no PCA do ano e campo editável do ID PNCP */}
            {catsDoAno.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  IDs de Contratação do PNCP por Categoria do PCA {pca.ano} (Campo Editável — {catsDoAno.length} categorias)
                </p>
                <div className="max-h-[32rem] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-left text-slate-600 shadow-xs">
                      <tr>
                        <th className="px-3 py-2 font-medium">Categoria</th>
                        <th className="px-3 py-2 font-medium">Setor Técnico Competente</th>
                        <th className="px-3 py-2 font-medium">Itens</th>
                        <th className="px-3 py-2 font-medium">Valor Total</th>
                        <th className="px-3 py-2 font-medium">Código PCA / ID do PNCP (Editável)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {catsDoAno.map((cat) => (
                        <tr
                          key={cat.id}
                          className={!cat.codigoPcaPadrao.trim() ? "bg-amber-50/40" : "hover:bg-slate-50"}
                        >
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {cat.nome}
                            {cat.consolidarPorObjeto && (
                              <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                Por Objeto
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{cat.setorNome}</td>
                          <td className="px-3 py-2 text-slate-600">{cat.qtdItens}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{brl(cat.valorTotal)}</td>
                          <td className="px-3 py-2">
                            <CodigoPcaCategoriaInput
                              categoriaId={cat.id}
                              valorInicial={cat.codigoPcaPadrao}
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
                Códigos PCA (PNCP) por processo de consolidação técnica já aberto
              </p>
              {(() => {
                const doAno = consolidacoes.filter((c) => c.pcaAno === pca.ano);
                if (doAno.length === 0) {
                  return <p className="text-sm text-slate-400">Nenhuma categoria consolidada pelos Setores Técnicos neste PCA ainda.</p>;
                }
                return (
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
                        {doAno.map((c) => (
                          <tr key={c.id}>
                            <td className="px-3 py-1.5 text-slate-900">{c.categoria?.nome ?? "—"}</td>
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
                );
              })()}
              <p className="mt-1 text-xs text-slate-500">
                Só é possível concluir o PCA e avançar para as demais fases quando todas as categorias e consolidações tiverem o ID do PNCP preenchido.
              </p>
              {consolidacoes.some((c) => c.pcaAno === pca.ano) && (
                <div className="mt-2 flex gap-3">
                  <a
                    href={`/admin/pca/${pca.ano}/consolidado-pdf`}
                    className="text-xs text-slate-600 underline hover:text-slate-900"
                  >
                    Baixar PCA Consolidado (PDF)
                  </a>
                  <a
                    href={`/admin/pca/${pca.ano}/consolidado-xlsx`}
                    className="text-xs text-slate-600 underline hover:text-slate-900"
                  >
                    XLSX
                  </a>
                </div>
              )}
            </div>

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
                <select name="unidadeId" required className="rounded-xl border border-slate-300 px-2 py-1 text-xs">
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
