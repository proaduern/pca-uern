"use client";

import { useRef, useState, useTransition } from "react";
import { criarAcessoGestorAtaAction } from "@/lib/actions/admin";

export default function NovoAcessoGestorAtaForm({ unidades }: { unidades: { id: string; nome: string; email: string }[] }) {
  const [vinculado, setVinculado] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await criarAcessoGestorAtaAction(formData);
            formRef.current?.reset();
            setVinculado(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Cadastrar Acesso da Unidade Gestora de Ata</h2>
      <p className="text-xs text-slate-500">
        Responsável por receber processos classificados como Ata de Registro de Preços após a Licitação, e
        solicitar à PROAD a autorização para iniciar a execução.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome da unidade</label>
        <input name="nome" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="vinculado"
          id="ata-vinculado"
          checked={vinculado}
          onChange={(e) => setVinculado(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="ata-vinculado" className="text-sm text-slate-700">
          Vincular a uma unidade demandante já cadastrada (mesmo login)
        </label>
      </div>

      {vinculado ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Unidade demandante vinculada</label>
          <select name="unidadeId" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Selecione a unidade…</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.email})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Email institucional (@uern.br)</label>
            <input name="email" type="email" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Senha inicial (provisória)</label>
            <input name="senhaInicial" type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
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
