"use client";

import { useState, useTransition } from "react";
import {
  atualizarTipificacaoAction,
  atualizarPrioridadeAction,
} from "@/lib/actions/admin";

export function EditarTipificacaoForm({
  id,
  nomeAtual,
}: {
  id: string;
  nomeAtual: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-[#003366] underline hover:text-[#002244]"
      >
        Editar
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await atualizarTipificacaoAction(id, fd);
          if (res.erro) {
            setErro(res.erro);
            return;
          }
          setAberto(false);
        });
      }}
      className="mt-1 flex flex-wrap items-center gap-2"
    >
      <input
        name="nome"
        defaultValue={nomeAtual}
        required
        disabled={isPending}
        className="w-56 rounded-xl border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#003366] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setErro(null);
          setAberto(false);
        }}
        className="text-xs text-slate-500 underline"
      >
        Cancelar
      </button>
      {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
    </form>
  );
}

export function EditarPrioridadeForm({
  id,
  fraseAtual,
  nivelAtual,
}: {
  id: string;
  fraseAtual: string;
  nivelAtual: "ALTISSIMA" | "ALTA" | "MEDIA" | "BAIXA";
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-[#003366] underline hover:text-[#002244]"
      >
        Editar
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await atualizarPrioridadeAction(id, fd);
          if (res.erro) {
            setErro(res.erro);
            return;
          }
          setAberto(false);
        });
      }}
      className="mt-1 flex flex-wrap items-center gap-2"
    >
      <input
        name="frase"
        defaultValue={fraseAtual}
        required
        disabled={isPending}
        className="w-64 rounded-xl border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
      />
      <select
        name="nivel"
        defaultValue={nivelAtual}
        disabled={isPending}
        className="rounded-xl border border-slate-300 px-2 py-1 text-xs text-slate-900"
      >
        <option value="ALTISSIMA">Altíssima</option>
        <option value="ALTA">Alta</option>
        <option value="MEDIA">Média</option>
        <option value="BAIXA">Baixa</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#003366] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setErro(null);
          setAberto(false);
        }}
        className="text-xs text-slate-500 underline"
      >
        Cancelar
      </button>
      {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
    </form>
  );
}
