"use client";

import { useRef, useState, useTransition } from "react";

export default function AcessoVinculavelForm({
  action,
  titulo,
  unidades,
}: {
  action: (formData: FormData) => Promise<void>;
  titulo: string;
  unidades: { id: string; nome: string; email: string }[];
}) {
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
            await action(formData);
            formRef.current?.reset();
            setVinculado(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
        <input
          name="nome"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="vinculado"
          id="vinculado"
          checked={vinculado}
          onChange={(e) => setVinculado(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="vinculado" className="text-sm text-slate-700">
          Vincular a uma unidade demandante já cadastrada (mesmo login)
        </label>
      </div>

      {vinculado ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Unidade demandante vinculada
          </label>
          <select
            name="unidadeId"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione a unidade…</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.email})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Quem fizer login com o email dessa unidade vai poder escolher o perfil.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Email institucional (@uern.br)
            </label>
            <input
              name="email"
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Senha inicial (provisória)
            </label>
            <input
              name="senhaInicial"
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
