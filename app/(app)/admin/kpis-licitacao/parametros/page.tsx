import { obterSessao, exigirAdminNaPagina } from "@/lib/auth";
import { obterParametrosKpiLicitacao } from "@/lib/services/kpi-licitacao";
import { salvarParametrosKpiAction, restaurarParametrosKpiAction } from "@/lib/actions/kpi-licitacao";
import Link from "next/link";
import {
  Sliders,
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Scale,
  Award,
  PackageCheck,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParametrosKpiLicitacaoPage() {
  await exigirAdminNaPagina();
  const params = await obterParametrosKpiLicitacao();

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/kpis-licitacao"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#003366] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Painel de KPIs
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#003366]" />
            Parâmetros & Metas de Eficiência de Licitações
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Personalize as metas de SLA (em dias), os prazos de cada fase setorial e os limiares dos ratings da PROAD.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {params.isCustomizado ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Parâmetros Customizados pelo Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#003366] border border-blue-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Padrões Originais (Lei 14.133/21)
            </span>
          )}
        </div>
      </div>

      {params.updatedAt && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 flex items-center justify-between">
          <span>
            Última alteração por: <strong>{params.atualizadoPor || "Administrador PROAD"}</strong>
          </span>
          <span>
            Data: <strong>{new Date(params.updatedAt).toLocaleString("pt-BR")}</strong>
          </span>
        </div>
      )}

      {/* Formulário Principal */}
      <form action={salvarParametrosKpiAction} className="space-y-8">
        {/* Bloco 1: Prazos da Fase Interna e Externa */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#003366]" />
              Metas de Prazos Setoriais da Licitação (Dias Corridos)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Estes valores balizam o cálculo de razão de eficiência do Gargalômetro e o tempo médio esperado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Demandante / ETP */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                1. Demandante (ETP & Riscos)
              </label>
              <p className="text-[11px] text-slate-500">
                Do DFD consolidado até a finalização do Estudo Técnico e Matriz de Riscos.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="demandanteEtp"
                  min="1"
                  max="120"
                  defaultValue={params.metas.demandanteEtp}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias corridos</span>
              </div>
            </div>

            {/* Pesquisa de Preços */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                2. Pesquisa de Preços (DLC)
              </label>
              <p className="text-[11px] text-slate-500">
                Prazo de elaboração da cesta de preços públicos e cotações de mercado.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="pesquisaPrecos"
                  min="1"
                  max="90"
                  defaultValue={params.metas.pesquisaPrecos}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias corridos</span>
              </div>
            </div>

            {/* Termo de Referência */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                3. Termo de Referência (TR)
              </label>
              <p className="text-[11px] text-slate-500">
                Prazo da Unidade de Planejamento da Contratação para consolidar o TR.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="termoReferencia"
                  min="1"
                  max="90"
                  defaultValue={params.metas.termoReferencia}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias corridos</span>
              </div>
            </div>

            {/* Minutas DLC */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                4. Minutas (Edital / Contrato / Ata)
              </label>
              <p className="text-[11px] text-slate-500">
                Prazo da DLC para confecção das minutas padronizadas da contratação.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="minutasDlc"
                  min="1"
                  max="60"
                  defaultValue={params.metas.minutasDlc}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias corridos</span>
              </div>
            </div>

            {/* Parecer Jurídico PGE */}
            <div className="rounded-xl border border-purple-200 p-4 bg-purple-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-purple-900">
                  5. Parecer Jurídico (PGE-RN)
                </label>
                <span className="text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded">
                  Referencial Externo
                </span>
              </div>
              <p className="text-[11px] text-purple-700">
                Prazo informativo de análise jurídica. <strong>100% neutro</strong> no rating de eficiência UERN.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="pgeReferencial"
                  min="1"
                  max="90"
                  defaultValue={params.metas.pgeReferencial}
                  required
                  className="w-24 rounded-lg border border-purple-300 bg-white px-3 py-1.5 text-sm font-bold text-purple-950 focus:border-purple-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-purple-700">dias (meta referencial)</span>
              </div>
            </div>

            {/* Agente de Contratação */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                6. Fase Externa (Agente de Contratação)
              </label>
              <p className="text-[11px] text-slate-500">
                Da publicação no PNCP, sessão pública, recursos até homologação final.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="agenteFaseExterna"
                  min="1"
                  max="120"
                  defaultValue={params.metas.agenteFaseExterna}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias corridos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Execução de Bens */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-blue-600" />
              Metas da Fase de Execução e Entrega de Bens
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Prazos de recebimento definitivo (art. 140 da Lei 14.133/21) e distribuição aos campi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Conferência Física até Recebimento Definitivo
              </label>
              <p className="text-[11px] text-slate-500">
                Prazo máximo para emissão do Termo de Recebimento Definitivo após conferência quantitativa e qualitativa.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="conferenciaDefinitivoBens"
                  min="1"
                  max="60"
                  defaultValue={params.metas.conferenciaDefinitivoBens}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Recebimento Definitivo até Entrega aos Destinatários
              </label>
              <p className="text-[11px] text-slate-500">
                Prazo para a Unidade de Entrega distribuir o bem aos campi ou setores solicitantes.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="entregaDestinatarioBens"
                  min="1"
                  max="30"
                  defaultValue={params.metas.entregaDestinatarioBens}
                  required
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600">dias</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Limiares da Escala de Eficiência */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Limiares da Escala de Eficiência e Ratings (0 a 100)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina a pontuação de corte para enquadramento das faixas de excelência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-cyan-900">
                Corte Faixa Diamante (Alta Eficiência)
              </label>
              <p className="text-[11px] text-cyan-700">Pontuação mínima para selo Diamante.</p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="limiarDiamante"
                  min="80"
                  max="100"
                  defaultValue={params.limiares.diamante}
                  required
                  className="w-20 rounded-lg border border-cyan-300 bg-white px-3 py-1.5 text-sm font-bold text-cyan-950 focus:border-cyan-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-cyan-800">pontos</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-emerald-900">
                Corte Faixa Ouro (Eficiente)
              </label>
              <p className="text-[11px] text-emerald-700">Pontuação mínima para selo Ouro.</p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="limiarOuro"
                  min="60"
                  max="89"
                  defaultValue={params.limiares.ouro}
                  required
                  className="w-20 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-emerald-950 focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-emerald-800">pontos</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Corte Faixa Prata (Atenção)
              </label>
              <p className="text-[11px] text-amber-700">Pontuação mínima para selo Prata (abaixo disso é Gargalo Crítico).</p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  name="limiarPrata"
                  min="40"
                  max="74"
                  defaultValue={params.limiares.prata}
                  required
                  className="w-20 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-950 focus:border-amber-600 focus:outline-none"
                />
                <span className="text-xs font-semibold text-amber-800">pontos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#003366] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#002244] transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Novos Parâmetros
          </button>
        </div>
      </form>

      {/* Botão de Restaurar Padrões */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800">Restaurar Padrões da Lei 14.133/2021</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Deseja desfazer todas as alterações e restabelecer os prazos e limiares originais de fábrica?
          </p>
        </div>
        <form action={restaurarParametrosKpiAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Restaurar Valores Padrão
          </button>
        </form>
      </div>
    </div>
  );
}
