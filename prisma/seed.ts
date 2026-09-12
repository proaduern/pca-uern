import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed: usuário admin (PROAD)...");
  const senhaHash = await bcrypt.hash("TrocarEssaSenha123!", 12);
  await prisma.usuario.upsert({
    where: { email: "adj.proad@uern.br" },
    update: {},
    create: { nome: "PROAD", email: "adj.proad@uern.br", senhaHash },
  });

  console.log("Seed: tipificações padrão...");
  for (const nome of [
    "Manutenção corretiva/preventiva",
    "Atualização tecnológica",
    "Expansão de atividades",
  ]) {
    await prisma.tipificacao.upsert({ where: { nome }, update: {}, create: { nome } });
  }

  console.log("Seed: prioridades padrão (frase visível à unidade / nível oculto)...");
  const prioridades: { frase: string; nivel: "ALTISSIMA" | "ALTA" | "MEDIA" | "BAIXA" }[] = [
    { frase: "Altíssima", nivel: "ALTISSIMA" },
    { frase: "Alta", nivel: "ALTA" },
    { frase: "Média", nivel: "MEDIA" },
    { frase: "Baixa", nivel: "BAIXA" },
  ];
  for (const p of prioridades) {
    await prisma.prioridade.upsert({ where: { frase: p.frase }, update: {}, create: p });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
