"use client";

import { useEffect } from "react";

/** Ver app/(app)/error.tsx — mesma rede de segurança genérica, para as
 * telas fora do login autenticado (login, trocar senha, selecionar PCA). */
export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-[#002244] to-[#003366] px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-2xl">
        <h1 className="text-lg font-semibold text-slate-900">Não foi possível concluir a ação</h1>
        <p className="text-sm text-slate-600">
          Algo impediu essa ação (dado inválido ou falha temporária). Tente novamente.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">Código de referência: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="w-full rounded-xl bg-[#003366] px-4 py-3 font-semibold text-white hover:bg-[#002244]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
