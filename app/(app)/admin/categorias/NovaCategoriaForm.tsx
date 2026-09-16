"use client";

import { useRef, useState, useTransition } from "react";
import { criarCategoriaAction } from "@/lib/actions/admin";

export default function NovaCategoriaForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<"MATERIAL" | "SERVICO">("MATERIAL");
  const [semItem, setSemItem] = useState(false);
  const [modoServico, setModoServico] = useState<"OBJETO" | "VALOR" | "ITENS">("OBJETO");

  // Só faz sentido configurar fluxo contínuo, dependência de contrato, teto
  // anual ou "fora do PCA" quando a categoria tem valor livre (material sem
  // catálogo, ou serviço em modo diferente de "objeto") — igual ao original.
  const mostraExtras = semItem || (tipo === "SERVICO" && modoServico !== "OBJETO");

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const resultado = await criarCategoriaAction(formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          formRef.current?.reset();
          setTipo("MATERIAL");
          setSemItem(false);
          setModoServico("OBJETO");
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Nova categoria</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
          <input name="nome" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Tipo</label>
          <select
            name="tipo"
            required
            value={tipo}
            onChange={(e) => {
              const novoTipo = e.target.value as typeof tipo;
              setTipo(novoTipo);
              // Espelha o servidor: fora de Material, semItem nunca se aplica.
              if (novoTipo !== "MATERIAL") setSemItem(false);
            }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="OBJETO">Objeto livre (nunca agrupa)</option>
              <option value="VALOR">Apenas valor (agrupa por categoria)</option>
              <option value="ITENS">Com catálogo de itens (agrupa por item)</option>
            </select>
          </div>
        )}
        {tipo === "MATERIAL" && (
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="semItem"
              name="semItem"
              checked={semItem}
              onChange={(e) => setSemItem(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="semItem" className="text-sm text-slate-700">
              Material sem catálogo (valor livre)
            </label>
          </div>
        )}
      </div>

      {mostraExtras && (
        <div className="grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Teto anual global (R$, opcional)
            </label>
            <input
              name="saldoAnualGlobal"
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="fluxoContinuo" name="fluxoContinuo" className="h-4 w-4" />
            <label htmlFor="fluxoContinuo" className="text-sm text-slate-700">
              Fluxo contínuo (pula todo o pipeline após aprovação)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dependeContrato"
              name="dependeContrato"
              defaultChecked
              className="h-4 w-4"
            />
            <label htmlFor="dependeContrato" className="text-sm text-slate-700">
              Depende de contrato
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ignoraPCA" name="ignoraPCA" className="h-4 w-4" />
            <label htmlFor="ignoraPCA" className="text-sm text-slate-700">
              Não consome o saldo geral do PCA
            </label>
          </div>
        </div>
      )}

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
