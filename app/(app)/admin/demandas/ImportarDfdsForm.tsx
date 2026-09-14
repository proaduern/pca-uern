"use client";

import { useRef, useState, useTransition } from "react";
import { importarDfdsPcaAction, type ResultadoImportacaoDfds } from "@/lib/actions/importacao";

const COLUNAS: { coluna: string; campo: string; obrigatorio: string }[] = [
  { coluna: "A", campo: "Demandante (nome exato da unidade, igual ao cadastro)", obrigatorio: "Sim" },
  { coluna: "C", campo: "Setor (informativo — entra na descrição sumária do DFD)", obrigatorio: "Não" },
  {
    coluna: "D",
    campo: 'Fonte do Recurso (OP.../GERAL/CONVÊNIO — outros valores viram "Geral")',
    obrigatorio: "Sim",
  },
  {
    coluna: "H",
    campo: "Modalidade (Contratação/Renovação Contratual)",
    obrigatorio: "Sim, exceto para Diárias/Passagens/Hospedagens",
  },
  { coluna: "I", campo: "Categoria", obrigatorio: "Sim" },
  {
    coluna: "J",
    campo:
      "Item (descrição do item, se for material) ou objeto (se for serviço) — deixe em branco para Diárias/Passagens/Hospedagens",
    obrigatorio: "Não — se vazio, usa o nome da categoria",
  },
  { coluna: "K", campo: "Quantidade", obrigatorio: "Não — padrão 1" },
  {
    coluna: "L",
    campo:
      'Nível de Prioridade (aceita "Alta, texto explicativo" — só o que vem antes da vírgula é lido como nível)',
    obrigatorio: 'Não — padrão "Média"',
  },
  { coluna: "M", campo: "Tipificação do problema", obrigatorio: "Não" },
  { coluna: "N", campo: "Valor Unitário", obrigatorio: "Sim, ou a O" },
  { coluna: "O", campo: "Valor Total", obrigatorio: "Sim, ou a N" },
  { coluna: "P", campo: "Observações Gerais (vira a correlação do item)", obrigatorio: "Não" },
  {
    coluna: "Q",
    campo: "Especificação Adicional (tem prioridade sobre a coluna P na correlação)",
    obrigatorio: "Não",
  },
];

export default function ImportarDfdsForm() {
  const [isPending, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacaoDfds | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Importar DFDs em Lote (Planilha)
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-slate-500">
          O arquivo deve ter uma única aba, com cabeçalho na linha 1 e dados a partir da linha 2.
          Diárias, Passagens e Hospedagens vão juntas com as demais categorias, na mesma aba — o
          sistema identifica essas três automaticamente pelo nome da categoria e as trata como
          Fluxo Contínuo (um DFD por unidade, sem exigir item).
        </p>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Coluna</th>
                <th className="px-3 py-1.5 font-medium">Campo</th>
                <th className="px-3 py-1.5 font-medium">Obrigatório?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COLUNAS.map((c) => (
                <tr key={c.coluna}>
                  <td className="px-3 py-1.5 font-medium text-slate-900">{c.coluna}</td>
                  <td className="px-3 py-1.5 text-slate-600">{c.campo}</td>
                  <td className="px-3 py-1.5 text-slate-600">{c.obrigatorio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">
          Colunas B (Setor Técnico), E (Convênio), F (Emenda) e G (Beneficiário) podem existir na
          planilha, mas não são lidas pela importação.
        </p>

        <p className="text-xs text-slate-500">
          Cada combinação de Unidade + Categoria vira um DFD (com um item por linha da planilha).
          Diárias/Passagens/Hospedagens viram um único DFD por unidade, com natureza Fluxo
          Contínuo. Todos os DFDs entram já como Aguardando Aprovação da PROAD. Itens de catálogo,
          tipificações e prioridades que não existirem ainda são criados automaticamente.
        </p>

        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            setErroGeral(null);
            setResultado(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                const r = await importarDfdsPcaAction(formData);
                setResultado(r);
                if (r.erros.length === 0) formRef.current?.reset();
              } catch (err) {
                setErroGeral(err instanceof Error ? err.message : "Erro inesperado.");
              }
            });
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Ano do PCA</label>
            <input
              name="anoPca"
              type="number"
              required
              placeholder="Ex: 2027"
              className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Arquivo (.xlsx)</label>
            <input type="file" name="arquivo" accept=".xlsx,.xls,.csv" required className="text-sm" />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
          >
            {isPending ? "Processando..." : "Processar e Importar"}
          </button>
        </form>
        <p className="text-xs text-amber-700">
          Atenção: os valores importados entram imediatamente no cálculo de saldo das unidades e
          do PCA (mesma regra de qualquer DFD aguardando aprovação) — se o total demandado
          ultrapassar a cota configurada, isso vai aparecer como saldo negativo até a PROAD
          revisar. Confirme que o PCA informado já está cadastrado e ativo antes de importar.
        </p>

        {erroGeral && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erroGeral}</p>}

        {resultado && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs text-emerald-700">DFDs criados</p>
                <p className="text-lg font-semibold text-emerald-900">{resultado.dfdsCriados}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-600">Itens importados</p>
                <p className="text-lg font-semibold text-slate-900">{resultado.itensCriados}</p>
              </div>
              <div
                className={`rounded-md border px-3 py-2 ${resultado.erros.length ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}
              >
                <p className={`text-xs ${resultado.erros.length ? "text-red-700" : "text-slate-600"}`}>
                  Erros (linhas não importadas)
                </p>
                <p className="text-lg font-semibold text-slate-900">{resultado.erros.length}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Itens de catálogo novos: <b>{resultado.catalogoNovo}</b> · Tipificações novas:{" "}
              <b>{resultado.tipificacoesNovas}</b> · Prioridades novas: <b>{resultado.prioridadesNovas}</b>
            </p>
            {resultado.erros.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium">Linhas com erro:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {resultado.erros.map((e, i) => (
                    <li key={i}>
                      Linha {e.linha}: {e.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
