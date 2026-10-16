import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const UNIDADES_47: {
  nome: string;
  email: string;
  elegivelCotaOP: boolean;
  cotaOP: number;
  cotaTipo: "FECHADA" | "ABERTA";
}[] = [
  { nome: "Almoxarifado - PROAD", email: "almoxarifado@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Patrimônio - PROAD", email: "patrimonio@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Transportes - PROAD", email: "transportes@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Setor de Diárias, Passagens e Hospedagens – PROAD", email: "diarias.proad@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Dir. Administração e Serviços - PROAD", email: "diradm@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "FALA", email: "fala@uern.br", elegivelCotaOP: true, cotaOP: 381640.77, cotaTipo: "FECHADA" },
  { nome: "FASSO", email: "fasso@uern.br", elegivelCotaOP: true, cotaOP: 115450.98, cotaTipo: "FECHADA" },
  { nome: "FAEF", email: "faef@uern.br", elegivelCotaOP: true, cotaOP: 156678.74, cotaTipo: "FECHADA" },
  { nome: "FAFIC", email: "fafic@uern.br", elegivelCotaOP: true, cotaOP: 485772.45, cotaTipo: "FECHADA" },
  { nome: "FE", email: "fe@uern.br", elegivelCotaOP: true, cotaOP: 275149.43, cotaTipo: "FECHADA" },
  { nome: "FAD", email: "fad@uern.br", elegivelCotaOP: true, cotaOP: 154051.55, cotaTipo: "FECHADA" },
  { nome: "FANAT", email: "fanat@uern.br", elegivelCotaOP: true, cotaOP: 465189.78, cotaTipo: "FECHADA" },
  { nome: "FACEM", email: "facem@uern.br", elegivelCotaOP: true, cotaOP: 421580.95, cotaTipo: "FECHADA" },
  { nome: "FAEN", email: "faen@uern.br", elegivelCotaOP: true, cotaOP: 157111.49, cotaTipo: "FECHADA" },
  { nome: "FACS", email: "facs@uern.br", elegivelCotaOP: true, cotaOP: 277867.35, cotaTipo: "FECHADA" },
  { nome: "Campus Pau dos Ferros", email: "pferros@uern.br", elegivelCotaOP: true, cotaOP: 686686.90, cotaTipo: "FECHADA" },
  { nome: "Campus Natal", email: "natal@uern.br", elegivelCotaOP: true, cotaOP: 419948.16, cotaTipo: "FECHADA" },
  { nome: "Campus Assu", email: "assu@uern.br", elegivelCotaOP: true, cotaOP: 344168.79, cotaTipo: "FECHADA" },
  { nome: "Campus Caicó", email: "caico@uern.br", elegivelCotaOP: true, cotaOP: 311643.34, cotaTipo: "FECHADA" },
  { nome: "Campus Patu", email: "patu@uern.br", elegivelCotaOP: true, cotaOP: 247059.32, cotaTipo: "FECHADA" },
  { nome: "PROEG", email: "proeg@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "PROPEG", email: "propeg@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "PROEX", email: "proex@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "PROGEP", email: "progep@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "PRAE", email: "prae@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "PROAD", email: "adj.proad@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "STI", email: "sti@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "SOBE", email: "sobe@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "UERNTV", email: "uerntv@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "AGECOM", email: "agecom@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "DICE", email: "dice@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "DIRI", email: "diri@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "DEAD", email: "dead@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "DIAAD", email: "diaad@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "DAIN", email: "dain@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "DSIB", email: "biblioteca@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "EDUERN", email: "edicoes.uern@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "GABINETE DA REITORIA", email: "chgab@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Ouvidoria", email: "ouvidoria@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "AGT", email: "governanca@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "AJUR", email: "ajur@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "AAI", email: "aai@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "AAN", email: "aan@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Comitê Especializado - Saúde e Laboratórios", email: "cesl@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Comitê Especializado - Eventos e Com. Visual", email: "ceeicv@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Comitê Especializado - Esportes e Lazer", email: "ceel@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
  { nome: "Comitê Especializado - Fotografia, Audio e Vídeo", email: "cefav@uern.br", elegivelCotaOP: false, cotaOP: 0, cotaTipo: "ABERTA" },
];

async function main() {
  console.log("Seed PCA: sincronizando 47 unidades oficiais da UERN...");
  const senhaHashUnidade = await bcrypt.hash("123", 10);

  for (const u of UNIDADES_47) {
    await prisma.unidade.upsert({
      where: { email: u.email },
      update: {
        nome: u.nome,
        elegivelCotaOP: u.elegivelCotaOP,
        cotaOP: u.cotaOP,
        cotaTipo: u.cotaTipo,
        ativa: true,
      },
      create: {
        nome: u.nome,
        email: u.email,
        senhaHash: senhaHashUnidade,
        senhaTemporaria: true,
        elegivelCotaOP: u.elegivelCotaOP,
        cotaOP: u.cotaOP,
        cotaGeral: 0,
        cotaTipo: u.cotaTipo,
        verCotaGeralPCA: false,
        ativa: true,
      },
    });
  }

  console.log("Seed PCA: usuários admins...");
  const senhaHashAdmin = await bcrypt.hash("Uern@2026", 12);
  const admins = [
    { nome: "Administrador Adjunto PROAD", email: "adj.proad@uern.br" },
    { nome: "Pedro Rebouças (Administrador Geral)", email: "pedroreboucas@uern.br" },
  ];

  for (const adm of admins) {
    await prisma.usuario.upsert({
      where: { email: adm.email },
      update: { role: "ADMIN", ativo: true },
      create: { nome: adm.nome, email: adm.email, senhaHash: senhaHashAdmin, role: "ADMIN", ativo: true },
    });
  }

  console.log("Seed PCA: tipificações padrão...");
  for (const nome of [
    "Manutenção corretiva/preventiva",
    "Atualização tecnológica",
    "Expansão de atividades",
  ]) {
    await prisma.tipificacao.upsert({ where: { nome }, update: {}, create: { nome } });
  }

  console.log("Seed PCA: prioridades padrão...");
  const prioridades: { frase: string; nivel: "ALTISSIMA" | "ALTA" | "MEDIA" | "BAIXA" }[] = [
    { frase: "Altíssima", nivel: "ALTISSIMA" },
    { frase: "Alta", nivel: "ALTA" },
    { frase: "Média", nivel: "MEDIA" },
    { frase: "Baixa", nivel: "BAIXA" },
  ];
  for (const p of prioridades) {
    await prisma.prioridade.upsert({ where: { frase: p.frase }, update: {}, create: p });
  }

  console.log("Seed PCA concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
