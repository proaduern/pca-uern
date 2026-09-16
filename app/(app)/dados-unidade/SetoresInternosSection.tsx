"use client";

import { useState, useTransition } from "react";
import {
  atualizarSetorInternoAction,
  criarSetorInternoAction,
  excluirSetorInternoAction,
  redefinirSenhaSetorInternoAction,
} from "@/lib/actions/setor-interno";

interface SetorInterno {
  id: string;
  nome: string;
  email: string;
  cotaOP: number;
  cotaGeral: number;
  ativo: boolean;
}

function LinhaSetorInterno({ setor }: { setor: SetorInterno }) {
  const [modo, setModo] = useState<"ver" | "editar" | "senha">("ver");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const rodar = (fn: () => Promise<{ erro?: string }>) => {
    setErro(null);
    startTransition(async () => {
      const resultado = await fn();
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setModo("ver");
    });
  };

  if (modo === "editar") {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              rodar(() => atualizarSetorInternoAction(setor.id, formData));
            }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:items-end"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
              <input name="nome" defaultValue={setor.nome} required className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
              <input name="email" type="email" defaultValue={setor.email} required className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Cota OP (R$)</label>
              <input name="cotaOP" type="number" min={0} step="0.01" defaultValue={setor.cotaOP} className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Cota Geral (R$)</label>
              <input name="cotaGeral" type="number" min={0} step="0.01" defaultValue={setor.cotaGeral} className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`ativo-${setor.id}`} name="ativo" defaultChecked={setor.ativo} className="h-4 w-4" />
              <label htmlFor={`ativo-${setor.id}`} className="text-xs text-slate-700">Ativo</label>
            </div>
            <div className="flex gap-2 sm:col-span-5">
              <button type="submit" disabled={isPending} className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white disabled:opacity-60">
                {isPending ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => setModo("ver")} className="text-xs text-slate-500">Cancelar</button>
            </div>
            {erro && <p className="text-xs text-red-600 sm:col-span-5">{erro}</p>}
          </form>
        </td>
      </tr>
    );
  }

  if (modo === "senha") {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              rodar(() => redefinirSenhaSetorInternoAction(setor.id, formData));
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nova senha</label>
              <input name="novaSenha" type="password" minLength={8} required className="rounded-xl border border-slate-300 px-2 py-1 text-xs" />
            </div>
            <button type="submit" disabled={isPending} className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white disabled:opacity-60">
              {isPending ? "Salvando..." : "Redefinir"}
            </button>
            <button type="button" onClick={() => setModo("ver")} className="text-xs text-slate-500">Cancelar</button>
            {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={setor.ativo ? "" : "opacity-50"}>
      <td className="px-4 py-2 text-slate-900">{setor.nome}</td>
      <td className="px-4 py-2 text-slate-600">{setor.email}</td>
      <td className="px-4 py-2 text-slate-600">{setor.cotaOP.toFixed(2)}</td>
      <td className="px-4 py-2 text-slate-600">{setor.cotaGeral.toFixed(2)}</td>
      <td className="px-4 py-2 space-x-2">
        <button onClick={() => setModo("editar")} className="text-xs text-slate-600 underline">Editar</button>
        <button onClick={() => setModo("senha")} className="text-xs text-slate-600 underline">Redefinir senha</button>
        <button
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Excluir o setor interno "${setor.nome}"?`)) return;
            rodar(() => excluirSetorInternoAction(setor.id));
          }}
          className="text-xs text-red-600 underline disabled:opacity-60"
        >
          Excluir
        </button>
        {erro && <span className="block text-xs text-red-600">{erro}</span>}
      </td>
    </tr>
  );
}

function NovoSetorInternoForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const form = e.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const resultado = await criarSetorInternoAction(formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          form.reset();
        });
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome do setor</label>
        <input name="nome" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Email (@uern.br)</label>
        <input name="email" type="email" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Cota OP (R$)</label>
        <input name="cotaOP" type="number" min={0} step="0.01" defaultValue={0} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Cota Geral (R$)</label>
        <input name="cotaGeral" type="number" min={0} step="0.01" defaultValue={0} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      </div>
      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-4">{erro}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60 sm:col-span-4 sm:w-fit"
      >
        {isPending ? "Salvando..." : "Criar setor interno"}
      </button>
    </form>
  );
}

export default function SetoresInternosSection({ setores }: { setores: SetorInterno[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Setores internos</h2>
        <p className="text-xs text-slate-500">
          Departamentos/cursos da unidade com login próprio para preencher DFDs — cada um começa
          com a senha padrão &quot;123&quot; (o sistema pede a troca no primeiro acesso), e a soma
          das cotas OP/Geral deles não pode passar da cota da própria unidade.
        </p>
      </div>
      <NovoSetorInternoForm />
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Cota OP</th>
              <th className="px-4 py-2 font-medium">Cota Geral</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {setores.map((s) => (
              <LinhaSetorInterno key={s.id} setor={s} />
            ))}
            {setores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum setor interno cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
