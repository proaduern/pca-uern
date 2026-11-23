import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const unidade = await prisma.unidade.findFirst({
    where: {
      OR: [
        { id: 'cmva9l5wl00023zmsofnlam7k' },
        { email: 'comissao.radiotv@uern.br' },
        { nome: { contains: 'Rádio e TV', mode: 'insensitive' } },
      ],
    },
  });

  if (!unidade) {
    throw new Error('Unidade Comissão Rádio e TV não encontrada.');
  }

  console.log('Unidade encontrada:', unidade.id, unidade.nome, unidade.email);

  let setor = await prisma.setorTecnico.findFirst({
    where: {
      OR: [
        { unidadeId: unidade.id },
        { nome: { contains: 'Comissão de TV e Rádio', mode: 'insensitive' } },
        { nome: { contains: 'Comissão Rádio e TV', mode: 'insensitive' } },
      ],
    },
  });

  if (!setor) {
    setor = await prisma.setorTecnico.create({
      data: {
        nome: 'Comissão de TV e Rádio',
        vinculado: true,
        unidadeId: unidade.id,
        ativo: true,
      },
    });
    console.log('Setor Técnico Criado:', setor);
  } else {
    setor = await prisma.setorTecnico.update({
      where: { id: setor.id },
      data: {
        nome: 'Comissão de TV e Rádio',
        vinculado: true,
        unidadeId: unidade.id,
        ativo: true,
      },
    });
    console.log('Setor Técnico Atualizado/Ativado:', setor);
  }

  const total = await prisma.setorTecnico.count();
  console.log('Total de Setores Técnicos cadastrados:', total);
}

main().finally(() => prisma.$disconnect());
