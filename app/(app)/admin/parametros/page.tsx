import { prisma } from "@/lib/prisma";
import {
  criarTipificacaoAction,
  excluirTipificacaoAction,
  criarPrioridadeAction,
  excluirPrioridadeAction,
} from "@/lib/actions/admin";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";
import {
  EditarTipificacaoForm,
  EditarPrioridadeForm,
} from "./EditarParametroForms";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function ParametrosPage() {
  await exigirAdminNaPagina();
  const [tipificacoes, prioridades] = await Promise.all([
    prisma.tipificacao.findMany({ orderBy: { nome: "asc" } }),
    prisma.prioridade.findMany({ orderBy: { frase: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Parâmetros</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <FormularioSimples
            action={criarTipificacaoAction}
            titulo="Nova tipificação"
            campos={[{ name: "nome", label: "Nome", required: true }]}
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {tipificacoes.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 text-slate-900">
                      <div>{t.nome}</div>
                      <EditarTipificacaoForm id={t.id} nomeAtual={t.nome} />
                    </td>
                    <td className="px-4 py-2 text-right align-top">
                      <BotaoExcluir action={excluirTipificacaoAction} id={t.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <FormularioSimples
            action={criarPrioridadeAction}
            titulo="Nova prioridade"
            campos={[
              { name: "frase", label: "Frase (o que a unidade vê)", required: true },
              {
                name: "nivel",
                label: "Nível real (oculto da unidade)",
                required: true,
                options: [
                  { value: "ALTISSIMA", label: "Altíssima" },
                  { value: "ALTA", label: "Alta" },
                  { value: "MEDIA", label: "Média" },
                  { value: "BAIXA", label: "Baixa" },
                ],
              },
            ]}
          />
          <p className="text-xs text-slate-500">
            A unidade demandante só vê a frase — o nível real fica visível só a partir do setor
            técnico, para evitar viés de resposta (todo mundo marcar &quot;alta&quot;).
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {prioridades.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-slate-900">
                      <div>{p.frase}</div>
                      <EditarPrioridadeForm
                        id={p.id}
                        fraseAtual={p.frase}
                        nivelAtual={p.nivel}
                      />
                    </td>
                    <td className="px-4 py-2 text-slate-500 align-top">{p.nivel}</td>
                    <td className="px-4 py-2 text-right align-top">
                      <BotaoExcluir action={excluirPrioridadeAction} id={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
