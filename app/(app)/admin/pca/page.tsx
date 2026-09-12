import { prisma } from "@/lib/prisma";
import { criarOuAtualizarPcaAction, adicionarExcecaoPcaAction } from "@/lib/actions/admin";
import { brl, formatarData } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import PcaAcoes from "./PcaAcoes";

export default async function PcaPage() {
  const [pcas, unidades] = await Promise.all([
    prisma.pca.findMany({ orderBy: { ano: "desc" }, include: { excecoes: true } }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" } }),
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
        <div key={pca.ano} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
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
              <p>{pca.concluido ? "Concluído" : "Em andamento"}</p>
            </div>
          </div>

          <PcaAcoes pca={pca} />

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
              <select name="unidadeId" required className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                <option value="">Selecione a unidade...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white">
                Adicionar exceção
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
