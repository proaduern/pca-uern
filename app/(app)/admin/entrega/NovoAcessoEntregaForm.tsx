"use client";

import { useRef, useState, useTransition } from "react";
import { criarAcessoEntregaAction } from "@/lib/actions/admin";
import { SUBPERFIL_ENTREGA_LABEL, type SubperfilEntrega } from "@/lib/entrega";

export default function NovoAcessoEntregaForm({ unidades }: { unidades: { id: string; nome: string; email: string }[] }) {
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
            await criarAcessoEntregaAction(formData);
            formRef.current?.reset();
            setVinculado(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Cadastrar Acesso da Unidade de Entrega de Bens</h2>
      <p className="text-xs text-slate-500">
        Responsável pela entrega dos itens de material já recebidos em definitivo pela Unidade de Materiais e
        Patrimônio. O roteamento entre os dois subperfis é automático, com base no Tipo de Bem do item
        (Permanente → Patrimônio; Consumo → Almoxarifado).
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome da unidade</label>
          <input name="nome" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Subperfil</label>
          <select name="subperfil" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {(Object.keys(SUBPERFIL_ENTREGA_LABEL) as SubperfilEntrega[]).map((s) => (
              <option key={s} value={s}>
                {SUBPERFIL_ENTREGA_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="vinculado"
          id="ent-vinculado"
          checked={vinculado}
          onChange={(e) => setVinculado(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="ent-vinculado" className="text-sm text-slate-700">
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
