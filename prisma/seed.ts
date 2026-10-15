import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const UNIDADES_OFICIAIS = [
  { codigo: '010', sigla: 'PROAD', nome: 'Pró-Reitoria de Administração', campus: 'Mossoró', email: 'proad@uern.br' },
  { codigo: '001', sigla: 'REITORIA', nome: 'Gabinete da Reitoria', campus: 'Mossoró', email: 'reitoria@uern.br' },
  { codigo: '011', sigla: 'PROEG', nome: 'Pró-Reitoria de Ensino de Graduação', campus: 'Mossoró', email: 'proeg@uern.br' },
  { codigo: '012', sigla: 'PROPEG', nome: 'Pró-Reitoria de Pesquisa e Pós-Graduação', campus: 'Mossoró', email: 'propeg@uern.br' },
  { codigo: '013', sigla: 'PROEX', nome: 'Pró-Reitoria de Extensão', campus: 'Mossoró', email: 'proex@uern.br' },
  { codigo: '014', sigla: 'PRAE', nome: 'Pró-Reitoria de Assuntos Estudantis', campus: 'Mossoró', email: 'prae@uern.br' },
  { codigo: '015', sigla: 'PROPLAN', nome: 'Pró-Reitoria de Planejamento, Orçamento e Finanças', campus: 'Mossoró', email: 'proplan@uern.br' },
  { codigo: '020', sigla: 'DINF', nome: 'Diretoria de Informatização', campus: 'Mossoró', email: 'dinf@uern.br' },
  { codigo: '025', sigla: 'SOBE', nome: 'Setor de Obras e Manutenção Predial', campus: 'Mossoró', email: 'sobe@uern.br' },
  { codigo: '101', sigla: 'FAFIC', nome: 'Faculdade de Filosofia e Ciências Sociais', campus: 'Mossoró', email: 'fafic@uern.br' },
  { codigo: '102', sigla: 'FANAT', nome: 'Faculdade de Ciências Exatas e Naturais', campus: 'Mossoró', email: 'fanat@uern.br' },
  { codigo: '103', sigla: 'FAE', nome: 'Faculdade de Educação', campus: 'Mossoró', email: 'fae@uern.br' },
  { codigo: '104', sigla: 'FACS', nome: 'Faculdade de Ciências da Saúde', campus: 'Mossoró', email: 'facs@uern.br' },
  { codigo: '105', sigla: 'FAD', nome: 'Faculdade de Direito', campus: 'Mossoró', email: 'fad@uern.br' },
  { codigo: '106', sigla: 'FASSO', nome: 'Faculdade de Serviço Social', campus: 'Mossoró', email: 'fasso@uern.br' },
  { codigo: '107', sigla: 'FAEN', nome: 'Faculdade de Enfermagem', campus: 'Mossoró', email: 'faen@uern.br' },
  { codigo: '108', sigla: 'FE', nome: 'Faculdade de Educação Física', campus: 'Mossoró', email: 'fe@uern.br' },
  { codigo: '201', sigla: 'CAMPUS-ASSU', nome: 'Campus Avançado Prefeito Walter de Sá Leitão', campus: 'Assú', email: 'campus.assu@uern.br' },
  { codigo: '202', sigla: 'CAMPUS-CAICO', nome: 'Campus de Caicó', campus: 'Caicó', email: 'campus.caico@uern.br' },
  { codigo: '203', sigla: 'CAMPUS-PATU', nome: 'Campus Avançado de Patu', campus: 'Patu', email: 'campus.patu@uern.br' },
  { codigo: '204', sigla: 'CAMPUS-PAU-FERROS', nome: 'Campus Avançado de Pau dos Ferros', campus: 'Pau dos Ferros', email: 'campus.pauferros@uern.br' },
  { codigo: '205', sigla: 'CAMPUS-NATAL', nome: 'Complexo Cultural / Campus de Natal', campus: 'Natal', email: 'campus.natal@uern.br' },
];

async function main() {
  console.log("Seed PCA: sincronizando 22 unidades oficiais da UERN...");
  for (const u of UNIDADES_OFICIAIS) {
    const nomeCompleto = `${u.sigla} - ${u.nome}`;
    const existente = await prisma.unidade.findUnique({ where: { email: u.email } });
    if (existente) {
      await prisma.unidade.update({
        where: { id: existente.id },
        data: { nome: nomeCompleto, ativa: true },
      });
    } else {
      await prisma.unidade.create({
        data: {
          nome: nomeCompleto,
          email: u.email,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativa: true,
          cotaTipo: "FECHADA",
          cotaOP: 0,
          cotaGeral: 0,
        },
      });
    }
  }

  console.log("Seed PCA: usuários admins...");
  const senhaHash = await bcrypt.hash("Uern@2026", 12);
  const admins = [
    { nome: "Administrador Adjunto PROAD", email: "adj.proad@uern.br" },
    { nome: "Pedro Rebouças (Administrador Geral)", email: "pedroreboucas@uern.br" },
  ];

  for (const adm of admins) {
    await prisma.usuario.upsert({
      where: { email: adm.email },
      update: { role: "ADMIN", ativo: true },
      create: { nome: adm.nome, email: adm.email, senhaHash, role: "ADMIN", ativo: true },
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
