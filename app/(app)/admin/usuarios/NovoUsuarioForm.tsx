"use client";

import { useRef, useState, useTransition } from "react";
import { criarUsuarioUnidadeAction } from "@/lib/actions/admin";
import { UserPlus, Shield } from "lucide-react";

interface UnidadeOption {
  id: string;
  nome: string;
}

export default function NovoUsuarioForm({
  unidades,
  unidadeSelecionadaId,
}: {
  unidades: UnidadeOption[];
  unidadeSelecionadaId?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Estados das 9 permissões
  const [podeCriarDfd, setPodeCriarDfd] = useState(true);
  const [podeEditarDfd, setPodeEditarDfd] = useState(true);
  const [podeEnviarDfd, setPodeEnviarDfd] = useState(false);
  const [podeExcluirDfd, setPodeExcluirDfd] = useState(false);
  const [podeSolicitarCatalogo, setPodeSolicitarCatalogo] = useState(true);
  const [podeSolicitarCotaGeral, setPodeSolicitarCotaGeral] = useState(false);
  const [podeConfirmarEntrega, setPodeConfirmarEntrega] = useState(true);
  const [podeGerenciarSetores, setPodeGerenciarSetores] = useState(false);
  const [podeEditarDadosUnidade, setPodeEditarDadosUnidade] = useState(false);

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
      <div className="flex justify-end">
        <button
          onClick={() => setAberto(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#003366] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#002244]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const resultado = await criarUsuarioUnidadeAction(formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          formRef.current?.reset();
          setAberto(false);
        });
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Novo Usuário de Unidade</h2>
          <p className="text-xs text-slate-500">
            Cadastre servidores e vincule-os à unidade correspondente com permissões específicas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Nome completo *</label>
          <input
            name="nome"
            required
            placeholder="Ex.: Maria de Fátima Silva"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Email institucional (@uern.br) *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="usuario@uern.br"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Unidade demandante vinculada *</label>
          <select
            name="unidadeId"
            required
            defaultValue={unidadeSelecionadaId ?? ""}
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
            placeholder="Ex.: 123456-7"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Cargo / Função</label>
          <input
            name="cargo"
            placeholder="Ex.: Chefe de Departamento / Servidor"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Telefone / Ramal</label>
          <input
            name="telefone"
            placeholder="(84) 99999-9999"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Senha provisória inicial * (mínimo 8 caracteres)
          </label>
          <input
            name="senhaInicial"
            type="password"
            required
            minLength={8}
            defaultValue="TrocarEssaSenha123!"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            O usuário será obrigado a definir uma senha pessoal definitiva no primeiro login.
          </p>
        </div>
      </div>

      {/* Matriz de Permissões */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#003366]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Permissões do Usuário na Unidade
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={aplicarPresetGestor}
              className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100"
            >
              Preset: Acesso Total
            </button>
            <button
              type="button"
              onClick={aplicarPresetOperador}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              Preset: Operador
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

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeCriarDfd"
              checked={podeCriarDfd}
              onChange={(e) => setPodeCriarDfd(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Criar DFDs</span>
              <p className="text-[11px] text-slate-500">Abrir novas demandas na janela ativa</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeEditarDfd"
              checked={podeEditarDfd}
              onChange={(e) => setPodeEditarDfd(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Editar DFDs</span>
              <p className="text-[11px] text-slate-500">Adicionar/remover itens em rascunho</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeEnviarDfd"
              checked={podeEnviarDfd}
              onChange={(e) => setPodeEnviarDfd(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Enviar para PROAD</span>
              <p className="text-[11px] text-slate-500">Submeter formalmente para homologação</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeExcluirDfd"
              checked={podeExcluirDfd}
              onChange={(e) => setPodeExcluirDfd(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Excluir DFDs</span>
              <p className="text-[11px] text-slate-500">Excluir rascunhos de demandas</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeSolicitarCatalogo"
              checked={podeSolicitarCatalogo}
              onChange={(e) => setPodeSolicitarCatalogo(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Solicitar Catálogo</span>
              <p className="text-[11px] text-slate-500">Pedir inclusão de novos itens à PROAD</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeSolicitarCotaGeral"
              checked={podeSolicitarCotaGeral}
              onChange={(e) => setPodeSolicitarCotaGeral(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Solicitar Cota Geral</span>
              <p className="text-[11px] text-slate-500">Exceção para unidades restritas à OP</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeConfirmarEntrega"
              checked={podeConfirmarEntrega}
              onChange={(e) => setPodeConfirmarEntrega(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Confirmar Entregas</span>
              <p className="text-[11px] text-slate-500">Atestar recebimento de bens/serviços</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeGerenciarSetores"
              checked={podeGerenciarSetores}
              onChange={(e) => setPodeGerenciarSetores(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Setores Internos</span>
              <p className="text-[11px] text-slate-500">Gerenciar departamentos e fatias de cota</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs transition hover:border-slate-300">
            <input
              type="checkbox"
              name="podeEditarDadosUnidade"
              checked={podeEditarDadosUnidade}
              onChange={(e) => setPodeEditarDadosUnidade(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Dados da Unidade</span>
              <p className="text-[11px] text-slate-500">Atualizar responsável e contatos</p>
            </div>
          </label>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {erro}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
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
          {isPending ? "Cadastrando..." : "Cadastrar Usuário"}
        </button>
      </div>
    </form>
  );
}
