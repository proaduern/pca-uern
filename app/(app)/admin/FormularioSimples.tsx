"use client";

import { useRef, useState, useTransition } from "react";
import type { ResultadoAcao } from "@/lib/actions/tipos";

interface Campo {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  checkbox?: boolean;
  options?: { value: string; label: string }[];
}

export default function FormularioSimples({
  action,
  titulo,
  campos,
}: {
  action: (formData: FormData) => Promise<ResultadoAcao | void>;
  titulo: string;
  campos: Campo[];
}) {
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
          const resultado = await action(formData);
          if (resultado?.erro) {
            setErro(resultado.erro);
            return;
          }
          formRef.current?.reset();
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campos.map((c) => (
          <div key={c.name} className={c.checkbox ? "flex items-center gap-2 pt-5" : ""}>
            {c.checkbox ? (
              <>
                <input type="checkbox" name={c.name} id={c.name} className="h-4 w-4" />
                <label htmlFor={c.name} className="text-sm text-slate-700">
                  {c.label}
                </label>
              </>
            ) : (
              <>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {c.label}
                </label>
                {c.options ? (
                  <select
                    name={c.name}
                    required={c.required}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {c.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={c.name}
                    type={c.type ?? "text"}
                    required={c.required}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>

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
