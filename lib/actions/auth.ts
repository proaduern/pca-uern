"use server";

import { redirect } from "next/navigation";
import { autenticar, criarSessao, destruirSessao, exigirSessao, gerarHashSenha } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface LoginState {
  erro?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe email e senha." };
  }

  const sessao = await autenticar(email, senha);
  if (!sessao) {
    return { erro: "Email ou senha inválidos." };
  }

  await criarSessao(sessao);
  redirect("/");
}

export async function logoutAction() {
  await destruirSessao();
  redirect("/login");
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
  } else {
    await prisma.unidade.update({
      where: { id: sessao.id },
      data: { senhaHash, senhaTemporaria: false },
    });
  }

  await criarSessao({ ...sessao, senhaTemporaria: false });
  redirect("/");
}
