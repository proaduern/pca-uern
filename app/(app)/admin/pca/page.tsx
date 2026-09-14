import { prisma } from "@/lib/prisma";
import { criarOuAtualizarPcaAction, adicionarExcecaoPcaAction } from "@/lib/actions/admin";
import { brl, formatarData } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import PcaAcoes from "./PcaAcoes";
import CodigoPcaInput from "./CodigoPcaInput";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function PcaPage() {
  await exigirAdminNaPagina();
  const [pcas, unidades, consolidacoes] = await Promise.all([
    prisma.pca.findMany({ orderBy: { ano: "desc" }, include: { excecoes: true } }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
    prisma.consolidacaoTecnica.findMany({ include: { categoria: true } }),
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
          { name: "cotaGeral", label: "Cota Geral (R$)", type: "number", required: true },
          { name: "cotaOP", label: "Cota OP (R$)", type: "number", required: true },
          { name: "dataAbertura", label: "Data de abertura", type: "date", required: true },
          { name: "dataFechamento", label: "Data de fechamento", type: "date", required: true },
        ]}
      />

      {pcas.map((pca) => (
        <div key={pca.ano} className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
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

          <PcaAcoes
            pca={{
              ano: pca.ano,
              ativo: pca.ativo,
              aberturaExtraGeral: pca.aberturaExtraGeral,
              concluido: pca.concluido,
            }}
          />

          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">
              Códigos PCA (PNCP) por categoria consolidada
            </p>
            {(() => {
              const doAno = consolidacoes.filter((c) => c.pcaAno === pca.ano);
              if (doAno.length === 0) {
                return <p className="text-sm text-slate-400">Nenhuma categoria consolidada neste PCA ainda.</p>;
              }
              return (
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Categoria</th>
                        <th className="px-3 py-1.5 font-medium">Processo SEI</th>
                        <th className="px-3 py-1.5 font-medium">Código PCA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doAno.map((c) => (
                        <tr key={c.id}>
                          <td className="px-3 py-1.5 text-slate-900">{c.categoria.nome}</td>
                          <td className="px-3 py-1.5 text-slate-600">{c.processoSEI}</td>
                          <td className="px-3 py-1.5">
                            <CodigoPcaInput
                              consolidacaoId={c.id}
                              valorInicial={c.codigoPca ?? ""}
                              desabilitado={pca.concluido}
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
              Só é possível concluir o PCA quando toda categoria consolidada tiver o código PCA
              preenchido.
            </p>
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
      ))}
    </div>
  );
}
