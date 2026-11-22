"use client";

import { useState, useTransition } from "react";
import { salvarCodigoPcaCategoriaAction } from "@/lib/actions/admin";

export default function CodigoPcaCategoriaInput({
  categoriaId,
  valorInicial,
  desabilitado = false,
}: {
  categoriaId: string;
  valorInicial: string;
  desabilitado?: boolean;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar(novoValor: string) {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      try {
        await salvarCodigoPcaCategoriaAction(categoriaId, novoValor);
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2500);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao salvar ID PNCP.");
      }
    });
  }

  const vazio = !valor.trim();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex: 925543-3/2027"
          disabled={desabilitado || isPending}
          onBlur={(e) => {
            if (e.target.value.trim() !== valorInicial.trim()) {
              salvar(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              salvar(valor);
            }
          }}
          className={`w-44 rounded-lg border px-2.5 py-1 text-xs font-mono ${
            vazio
              ? "border-amber-400 bg-amber-50/70 text-amber-950 placeholder:text-amber-600/70"
              : "border-emerald-300 bg-emerald-50/40 text-slate-900"
          }`}
        />
        <button
          type="button"
          disabled={desabilitado || isPending}
          onClick={() => salvar(valor)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {isPending ? "..." : "Salvar"}
        </button>
      </div>
      {vazio && (
        <span className="text-[10px] font-semibold text-amber-700">
          ⚠️ Sem ID PNCP — obrigatório incluir p/ concluir o PCA
        </span>
      )}
      {salvo && (
        <span className="text-[10px] font-semibold text-emerald-700">
          ✓ ID PNCP atualizado!
        </span>
      )}
      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
    </div>
  );
}
