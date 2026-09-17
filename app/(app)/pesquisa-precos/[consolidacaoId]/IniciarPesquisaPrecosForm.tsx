"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { iniciarPesquisaPrecosAction } from "@/lib/actions/pesquisa-precos";

export default function IniciarPesquisaPrecosForm({ consolidacaoTecnicaId }: { consolidacaoTecnicaId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const resultado = await iniciarPesquisaPrecosAction(consolidacaoTecnicaId, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          router.refresh();
        });
      }}
      className="space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Iniciar Pesquisa de Preços</h2>
      <p className="text-xs text-slate-500">
        Envie o PDF com a pesquisa de preços realizada (cotações, Painel de Preços, contratos
        similares etc.). O texto do PDF é extraído e fica disponível como referência — os valores
        de cada item são digitados e confirmados por você a seguir, o sistema não os preenche
        automaticamente.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">PDF da pesquisa de preços</label>
        <input
          name="arquivo"
          type="file"
          accept="application/pdf"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Metodologia da pesquisa (opcional agora — pode ser preenchida depois)
        </label>
        <textarea
          name="metodologia"
          rows={3}
          placeholder="Fontes consultadas, critério de composição do preço estimado, tratamento de valores inexequíveis/excessivos etc."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Lendo PDF..." : "Enviar e Iniciar Pesquisa de Preços"}
      </button>
    </form>
  );
}
