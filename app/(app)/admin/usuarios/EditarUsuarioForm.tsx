"use client";

import { useState, useTransition } from "react";
import { atualizarUsuarioUnidadeAction } from "@/lib/actions/admin";
import { Shield, Edit2, X } from "lucide-react";

interface UsuarioParaEdicao {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  cargo: string | null;
  telefone: string | null;
  unidadeId: string | null;
  ativo: boolean;
  podeCriarDfd: boolean;
  podeEditarDfd: boolean;
  podeEnviarDfd: boolean;
  podeExcluirDfd: boolean;
  podeSolicitarCatalogo: boolean;
  podeSolicitarCotaGeral: boolean;
  podeConfirmarEntrega: boolean;
  podeGerenciarSetores: boolean;
  podeEditarDadosUnidade: boolean;
}

interface UnidadeOption {
  id: string;
  nome: string;
}

export default function EditarUsuarioForm({
  usuario,
  unidades,
}: {
  usuario: UsuarioParaEdicao;
  unidades: UnidadeOption[];
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [podeCriarDfd, setPodeCriarDfd] = useState(usuario.podeCriarDfd);
  const [podeEditarDfd, setPodeEditarDfd] = useState(usuario.podeEditarDfd);
  const [podeEnviarDfd, setPodeEnviarDfd] = useState(usuario.podeEnviarDfd);
  const [podeExcluirDfd, setPodeExcluirDfd] = useState(usuario.podeExcluirDfd);
  const [podeSolicitarCatalogo, setPodeSolicitarCatalogo] = useState(usuario.podeSolicitarCatalogo);
  const [podeSolicitarCotaGeral, setPodeSolicitarCotaGeral] = useState(usuario.podeSolicitarCotaGeral);
  const [podeConfirmarEntrega, setPodeConfirmarEntrega] = useState(usuario.podeConfirmarEntrega);
  const [podeGerenciarSetores, setPodeGerenciarSetores] = useState(usuario.podeGerenciarSetores);
  const [podeEditarDadosUnidade, setPodeEditarDadosUnidade] = useState(usuario.podeEditarDadosUnidade);

  const aplicarPresetGestor = () => {
    setPodeCriarDfd(true);
    setPodeEditarDfd(true);
    setPodeEnviarDfd(true);
    setPodeExcluirDfd(true);
    setPodeSolicitarCatalogo(true);
    setPodeSolicitarCotaGeral(true);
    setPodeConfirmarEntrega(true);
    setPodeGerenciarSetores(true);
    setPodeEditarDadosUnidade(true);
  };

  const aplicarPresetOperador = () => {
    setPodeCriarDfd(true);
    setPodeEditarDfd(true);
    setPodeEnviarDfd(true);
    setPodeExcluirDfd(false);
    setPodeSolicitarCatalogo(true);
    setPodeSolicitarCotaGeral(false);
    setPodeConfirmarEntrega(true);
    setPodeGerenciarSetores(false);
    setPodeEditarDadosUnidade(false);
  };

  const aplicarPresetConsulta = () => {
    setPodeCriarDfd(false);
    setPodeEditarDfd(false);
    setPodeEnviarDfd(false);
    setPodeExcluirDfd(false);
    setPodeSolicitarCatalogo(false);
    setPodeSolicitarCotaGeral(false);
    setPodeConfirmarEntrega(false);
    setPodeGerenciarSetores(false);
    setPodeEditarDadosUnidade(false);
  };

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
      >
        <Edit2 className="h-3.5 w-3.5 text-slate-500" />
        <span>Editar</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Editar Usuário e Permissões</h2>
            <p className="text-xs text-slate-500">{usuario.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const resultado = await atualizarUsuarioUnidadeAction(usuario.id, formData);
              if (resultado.erro) {
                setErro(resultado.erro);
                return;
              }
              setAberto(false);
            });
          }}
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nome completo *</label>
              <input
                name="nome"
                required
                defaultValue={usuario.nome}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email (@uern.br) *</label>
              <input
                name="email"
                type="email"
                required
                defaultValue={usuario.email}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Unidade demandante *</label>
              <select
                name="unidadeId"
                required
                defaultValue={usuario.unidadeId ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
              >
                <option value="" disabled>
                  Selecione uma unidade...
                </option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Matrícula</label>
              <input
                name="matricula"
                defaultValue={usuario.matricula ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cargo / Função</label>
              <input
                name="cargo"
                defaultValue={usuario.cargo ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Telefone / Ramal</label>
              <input
                name="telefone"
                defaultValue={usuario.telefone ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 sm:col-span-2">
              <input
                type="checkbox"
                id={`ativo-${usuario.id}`}
                name="ativo"
                defaultChecked={usuario.ativo}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`ativo-${usuario.id}`} className="text-xs font-semibold text-slate-800">
                Usuário ativo (permite login no sistema)
              </label>
            </div>
          </div>

          {/* Permissões */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#003366]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Permissões do Usuário
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={aplicarPresetGestor}
                  className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
                >
                  Acesso Total
                </button>
                <button
                  type="button"
                  onClick={aplicarPresetOperador}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Operador
                </button>
                <button
                  type="button"
                  onClick={aplicarPresetConsulta}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Apenas Leitura
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeCriarDfd"
                  checked={podeCriarDfd}
                  onChange={(e) => setPodeCriarDfd(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Criar DFDs</span>
                  <p className="text-[10px] text-slate-500">Abrir novas demandas</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeEditarDfd"
                  checked={podeEditarDfd}
                  onChange={(e) => setPodeEditarDfd(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Editar DFDs</span>
                  <p className="text-[10px] text-slate-500">Alterar itens em rascunho</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeEnviarDfd"
                  checked={podeEnviarDfd}
                  onChange={(e) => setPodeEnviarDfd(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Enviar para PROAD</span>
                  <p className="text-[10px] text-slate-500">Submeter formalmente</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeExcluirDfd"
                  checked={podeExcluirDfd}
                  onChange={(e) => setPodeExcluirDfd(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Excluir DFDs</span>
                  <p className="text-[10px] text-slate-500">Apagar rascunhos</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeSolicitarCatalogo"
                  checked={podeSolicitarCatalogo}
                  onChange={(e) => setPodeSolicitarCatalogo(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Solicitar Catálogo</span>
                  <p className="text-[10px] text-slate-500">Novos itens padronizados</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeSolicitarCotaGeral"
                  checked={podeSolicitarCotaGeral}
                  onChange={(e) => setPodeSolicitarCotaGeral(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Solicitar Cota Geral</span>
                  <p className="text-[10px] text-slate-500">Exceção de OP</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeConfirmarEntrega"
                  checked={podeConfirmarEntrega}
                  onChange={(e) => setPodeConfirmarEntrega(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Confirmar Entregas</span>
                  <p className="text-[10px] text-slate-500">Aceite de bens entregues</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeGerenciarSetores"
                  checked={podeGerenciarSetores}
                  onChange={(e) => setPodeGerenciarSetores(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Setores Internos</span>
                  <p className="text-[10px] text-slate-500">Cotas dos setores</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
                <input
                  type="checkbox"
                  name="podeEditarDadosUnidade"
                  checked={podeEditarDadosUnidade}
                  onChange={(e) => setPodeEditarDadosUnidade(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold text-slate-800">Dados da Unidade</span>
                  <p className="text-[10px] text-slate-500">Editar responsável</p>
                </div>
              </label>
            </div>
          </div>

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-xl bg-[#003366] px-4 py-2 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
