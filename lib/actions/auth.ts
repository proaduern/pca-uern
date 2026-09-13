"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  autenticar,
  confirmarPerfil,
  criarSessao,
  destruirSessao,
  encerrarAtuarComo,
  exigirSessao,
  gerarHashSenha,
  iniciarAtuarComo,
  type OpcaoPerfil,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface LoginState {
  erro?: string;
  escolherPerfil?: OpcaoPerfil[];
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe email e senha." };
  }

  const resultado = await autenticar(email, senha);
  if (!resultado) {
    return { erro: "Email ou senha inválidos." };
  }

  if (resultado.resultado === "escolher_perfil") {
    return { escolherPerfil: resultado.opcoes };
  }

  await criarSessao(resultado.sessao);
  redirect("/");
}

export async function confirmarPerfilAction(tipo: string, id: string) {
  const sessao = await confirmarPerfil(tipo, id);
  await criarSessao(sessao);
  redirect("/");
}

export async function logoutAction() {
  await destruirSessao();
  redirect("/login");
}

export async function iniciarAtuarComoAction(
  tipo: "UNIDADE" | "SETOR_TECNICO" | "LICITACOES" | "EXECUCAO" | "ENTREGA" | "GESTOR_ATA",
  id: string,
) {
  await iniciarAtuarComo(tipo, id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function encerrarAtuarComoAction() {
  await encerrarAtuarComo();
  redirect("/");
}

export interface TrocarSenhaState {
  erro?: string;
}

export async function trocarSenhaAction(
  _prevState: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const sessao = await exigirSessao();
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (novaSenha.length < 8) {
    return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  if (novaSenha !== confirmacao) {
    return { erro: "As senhas não coincidem." };
  }

  const senhaHash = await gerarHashSenha(novaSenha);

  if (sessao.tipo === "ADMIN") {
    await prisma.usuario.update({ where: { id: sessao.id }, data: { senhaHash } });
  } else if (sessao.tipo === "UNIDADE") {
    await prisma.unidade.update({
      where: { id: sessao.id },
      data: { senhaHash, senhaTemporaria: false },
    });
  } else if (sessao.tipo === "SETOR_TECNICO") {
    const setor = await prisma.setorTecnico.findUniqueOrThrow({ where: { id: sessao.id } });
    if (setor.vinculado) {
      // Login vinculado: a senha é a da unidade demandante, não uma própria.
      await prisma.unidade.update({ where: { id: setor.unidadeId! }, data: { senhaHash, senhaTemporaria: false } });
    } else {
      await prisma.setorTecnico.update({ where: { id: sessao.id }, data: { senhaHash, senhaTemporaria: false } });
    }
  } else if (sessao.tipo === "LICITACOES") {
    const lic = await prisma.licitacoes.findUniqueOrThrow({ where: { id: sessao.id } });
    if (lic.vinculado) {
      await prisma.unidade.update({ where: { id: lic.unidadeId! }, data: { senhaHash, senhaTemporaria: false } });
    } else {
      await prisma.licitacoes.update({ where: { id: sessao.id }, data: { senhaHash, senhaTemporaria: false } });
    }
  } else if (sessao.tipo === "EXECUCAO") {
    const exec = await prisma.acessoExecucao.findUniqueOrThrow({ where: { id: sessao.id } });
    if (exec.vinculado) {
      await prisma.unidade.update({ where: { id: exec.unidadeId! }, data: { senhaHash, senhaTemporaria: false } });
    } else {
      await prisma.acessoExecucao.update({ where: { id: sessao.id }, data: { senhaHash, senhaTemporaria: false } });
    }
  } else if (sessao.tipo === "ENTREGA") {
    const ent = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: sessao.id } });
    if (ent.vinculado) {
      await prisma.unidade.update({ where: { id: ent.unidadeId! }, data: { senhaHash, senhaTemporaria: false } });
    } else {
      await prisma.acessoEntrega.update({ where: { id: sessao.id }, data: { senhaHash, senhaTemporaria: false } });
    }
  } else {
    const ata = await prisma.acessoGestorAta.findUniqueOrThrow({ where: { id: sessao.id } });
    if (ata.vinculado) {
      await prisma.unidade.update({ where: { id: ata.unidadeId! }, data: { senhaHash, senhaTemporaria: false } });
    } else {
      await prisma.acessoGestorAta.update({ where: { id: sessao.id }, data: { senhaHash, senhaTemporaria: false } });
    }
  }

  await criarSessao({ ...sessao, senhaTemporaria: false });
  redirect("/");
}
