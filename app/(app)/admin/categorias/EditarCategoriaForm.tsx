"use client";

import { useState, useTransition } from "react";
import { atualizarCategoriaAction } from "@/lib/actions/admin";

interface CategoriaParaEdicao {
  id: string;
  tipo: "MATERIAL" | "SERVICO";
  semItem: boolean;
  modoServico: "OBJETO" | "VALOR" | "ITENS";
  fluxoContinuo: boolean;
  dependeContrato: boolean;
  ignoraPCA: boolean;
  saldoAnualGlobal: number | null;
  classificacaoRubrica: string | null;
  tipoBemPadrao: "CONSUMO" | "PERMANENTE" | null;
}

export default function EditarCategoriaForm({ categoria }: { categoria: CategoriaParaEdicao }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState(categoria.tipo);
  const [semItem, setSemItem] = useState(categoria.semItem);
  const [modoServico, setModoServico] = useState(categoria.modoServico);

  const mostraExtras = semItem || (tipo === "SERVICO" && modoServico !== "OBJETO");
  const precisaTipoBemPadrao = tipo === "MATERIAL" && semItem;

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
        Editar
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const resultado = await atualizarCategoriaAction(categoria.id, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
          } else {
            setAberto(false);
          }
        });
      }}
      className="mt-2 w-72 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Classificação / Rubrica Geral
        </label>
        <input
          name="classificacaoRubrica"
          defaultValue={categoria.classificacaoRubrica ?? ""}
          placeholder="ex.: 3.3.9.0.30 Material de Consumo"
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Tipo</label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => {
            const novoTipo = e.target.value as typeof tipo;
            setTipo(novoTipo);
            if (novoTipo !== "MATERIAL") setSemItem(false);
          }}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="MATERIAL">Material</option>
          <option value="SERVICO">Serviço</option>
        </select>
      </div>
      {tipo === "SERVICO" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Modo de serviço</label>
          <select
            name="modoServico"
            value={modoServico}
            onChange={(e) => setModoServico(e.target.value as typeof modoServico)}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="OBJETO">Objeto livre (nunca agrupa)</option>
            <option value="VALOR">Apenas valor (agrupa por categoria)</option>
            <option value="ITENS">Com catálogo de itens (agrupa por item)</option>
          </select>
        </div>
      )}
      {tipo === "MATERIAL" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`semItem-${categoria.id}`}
            name="semItem"
            checked={semItem}
            onChange={(e) => setSemItem(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor={`semItem-${categoria.id}`} className="text-xs text-slate-700">
            Material sem catálogo (valor livre)
          </label>
        </div>
      )}
      {precisaTipoBemPadrao && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Tipo de bem (não tem catálogo pra escolher por item)
          </label>
          <select
            name="tipoBemPadrao"
            defaultValue={categoria.tipoBemPadrao ?? ""}
            required
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="PERMANENTE">Permanente (Patrimônio)</option>
            <option value="CONSUMO">Consumo (Almoxarifado)</option>
          </select>
        </div>
      )}

      {mostraExtras && (
        <div className="space-y-2 rounded-md bg-white p-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Teto anual global (R$, opcional)
            </label>
            <input
              name="saldoAnualGlobal"
              type="number"
              min={0}
              step="0.01"
              defaultValue={categoria.saldoAnualGlobal ?? ""}
              className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`fluxoContinuo-${categoria.id}`}
              name="fluxoContinuo"
              defaultChecked={categoria.fluxoContinuo}
              className="h-4 w-4"
            />
            <label htmlFor={`fluxoContinuo-${categoria.id}`} className="text-xs text-slate-700">
              Fluxo contínuo (pula todo o pipeline após aprovação)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`dependeContrato-${categoria.id}`}
              name="dependeContrato"
              defaultChecked={categoria.dependeContrato}
              className="h-4 w-4"
            />
            <label htmlFor={`dependeContrato-${categoria.id}`} className="text-xs text-slate-700">
              Depende de contrato
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`ignoraPCA-${categoria.id}`}
              name="ignoraPCA"
              defaultChecked={categoria.ignoraPCA}
              className="h-4 w-4"
            />
            <label htmlFor={`ignoraPCA-${categoria.id}`} className="text-xs text-slate-700">
              Não consome o saldo geral do PCA
            </label>
          </div>
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
          Cancelar
        </button>
      </div>
    </form>
  );
}
