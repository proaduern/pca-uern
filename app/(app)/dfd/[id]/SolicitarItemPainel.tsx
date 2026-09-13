"use client";

import { useRef, useState, useTransition } from "react";
import { enviarSolicitacaoCatalogoAction } from "@/lib/actions/solicitacoes";

export default function SolicitarItemPainel() {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!aberto) {
    return (
      <p className="text-xs text-slate-500">
        {enviado ? (
          <span className="text-emerald-600">Solicitação enviada ao administrador para análise. </span>
        ) : null}
        Não encontrou o material desejado no catálogo?{" "}
        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setAberto(true);
          }}
          className="underline"
        >
          Solicitar inclusão de novo item
        </button>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-sm font-semibold text-slate-900">
        Solicitar Inclusão de Novo Item no Catálogo
      </h4>
      <p className="text-xs text-slate-500">
        Sua solicitação será enviada ao administrador para análise. Se aprovada, o item passa a
        integrar o catálogo padronizado.
      </p>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          setErro(null);
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await enviarSolicitacaoCatalogoAction(formData);
              formRef.current?.reset();
              setEnviado(true);
              setAberto(false);
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Erro inesperado.");
            }
          });
        }}
        className="space-y-2"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome resumido do bem</label>
          <input
            name="nomeResumido"
            required
            placeholder="Ex: Cadeira ergonômica giratória"
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Descrição detalhada</label>
          <textarea
            name="descricao"
            required
            rows={2}
            placeholder="Descreva as especificações e características do bem"
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Marca/modelo de referência
            </label>
            <input
              name="marcaModelo"
              placeholder="Ex: Marca X, modelo Y"
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Link de referência na internet
            </label>
            <input
              name="link"
              placeholder="https://..."
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Aplicação prática</label>
          <textarea
            name="aplicacao"
            required
            rows={2}
            placeholder="Para que essa aquisição será usada?"
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Valor estimado (R$)</label>
            <input
              name="valorEstimado"
              type="number"
              min={0}
              step="0.01"
              required
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de bem</label>
            <select
              name="tipoBemSugerido"
              required
              defaultValue="PERMANENTE"
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="PERMANENTE">Permanente</option>
              <option value="CONSUMO">Consumo</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Se tiver dúvida: dura vários anos sem se esgotar = Permanente; se esgota com o uso =
              Consumo.
            </p>
          </div>
        </div>

        {erro && <p className="text-xs text-red-600">{erro}</p>}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            {isPending ? "Enviando..." : "Enviar Solicitação"}
          </button>
          <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
            Cancelar
          </button>
        </div>
      </form>
      {enviado && (
        <p className="text-xs text-emerald-600">Solicitação enviada ao administrador para análise.</p>
      )}
    </div>
  );
}
