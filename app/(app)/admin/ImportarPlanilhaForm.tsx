"use client";

import { useRef, useState, useTransition } from "react";

interface ResultadoImportacao {
  sucesso: number;
  erros: { linha: number; mensagem: string }[];
}

export default function ImportarPlanilhaForm({
  action,
  titulo,
  colunas,
  modeloHref,
}: {
  action: (formData: FormData) => Promise<ResultadoImportacao>;
  titulo: string;
  colunas: string[];
  modeloHref: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">{titulo}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-slate-500">
          Colunas esperadas na primeira linha do arquivo:{" "}
          <code className="rounded bg-slate-100 px-1">{colunas.join(", ")}</code>.{" "}
          <a href={modeloHref} className="text-slate-700 underline" download>
            Baixar modelo (.csv)
          </a>
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
                const r = await action(formData);
                setResultado(r);
                if (r.erros.length === 0) formRef.current?.reset();
              } catch (err) {
                setErroGeral(err instanceof Error ? err.message : "Erro inesperado.");
              }
            });
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="file" name="arquivo" accept=".xlsx,.xls,.csv" required className="text-sm" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
          >
            {isPending ? "Importando..." : "Importar"}
          </button>
        </form>

        {erroGeral && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erroGeral}</p>}

        {resultado && (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              {resultado.sucesso} registro(s) importado(s) com sucesso.
            </p>
            {resultado.erros.length > 0 && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium">{resultado.erros.length} linha(s) com erro:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {resultado.erros.map((e) => (
                    <li key={e.linha}>
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
