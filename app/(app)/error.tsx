"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Rede de segurança genérica para erros de render/runtime inesperados nesta
 * área (bugs reais, não validação de negócio). Validação de formulário usa
 * o contrato ResultadoAcao (ver lib/actions/tipos.ts) e nunca chega aqui —
 * um `throw` de validação dentro de uma server action chamada direto do
 * cliente quebra antes mesmo de qualquer boundary do React rodar (bug do
 * Next.js 16.3.5 em produção), então esta tela não substitui aquele
 * conserto, só cobre o que sobra: erros de fato inesperados.
 */
export default function AppErrorBoundary({
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
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-base font-semibold text-slate-900">Não foi possível concluir a ação</h1>
        <p className="text-sm text-slate-600">
          Algo impediu que essa ação fosse concluída — pode ser um dado inválido (e-mail já
          cadastrado, cota excedida, campo obrigatório) ou uma falha temporária. Tente novamente;
          se persistir, avise a PROAD com a hora aproximada.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">Código de referência: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#002244]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
