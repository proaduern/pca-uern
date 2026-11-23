import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const previaData = JSON.parse(fs.readFileSync('./scripts/data/previa-titulos-dfds.json', 'utf8'));

function gerarId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

async function main() {
  console.log('Iniciando aplicação dos títulos com objeto e separação do Centro Cultural...');

  // 1. EDUERN SEI 44897642
  const eduernDfd = await prisma.dfd.findFirst({
    where: { ano: 2027, idSeiDfdOrigem: '44897642' },
    include: { itens: true }
  });

  if (eduernDfd) {
    console.log(`Atualizando DFD EDUERN ${eduernDfd.id}...`);
    await prisma.dfd.update({
      where: { id: eduernDfd.id },
      data: {
        descricaoSumaria: 'Depósito de DOI - Identificador de Objeto Digital de Livros publicados (SEI 44897642) — EDUERN'
      }
    });

    if (eduernDfd.itens.length > 0) {
      await prisma.itemDfd.update({
        where: { id: eduernDfd.itens[0].id },
        data: {
          itemNomeLivre: 'Depósito de DOI - Identificador de Objeto Digital de Livros publicados'
        }
      });
    }
    console.log('DFD e Item da EDUERN atualizados com sucesso.');
  }

  // 2. Separação do Centro Cultural na PROEX
  const proexDfd = await prisma.dfd.findUnique({
    where: { id: 'dfd27_a4b2741dcb7a93ae6e54' },
    include: { itens: true, unidade: true }
  });

  if (proexDfd) {
    const itemCentroCultural = proexDfd.itens.find(it => /Centro Cultural/i.test(it.itemNomeLivre || ''));

    if (itemCentroCultural && proexDfd.itens.length > 1) {
      console.log('Desmembrando Centro Cultural de dfd27_a4b2741dcb7a93ae6e54...');

      // Obter maior número de DFD para PROEX
      const maxNum = await prisma.dfd.aggregate({
        where: { ano: 2027, unidadeId: proexDfd.unidadeId },
        _max: { numero: true }
      });
      const proximoNumero = (maxNum._max.numero || 15) + 1;

      const novoDfdId = gerarId('dfd27');
      const novoDfd = await prisma.dfd.create({
        data: {
          id: novoDfdId,
          unidadeId: proexDfd.unidadeId,
          ano: 2027,
          numero: proximoNumero,
          descricaoSumaria: 'Gestão compartilhada, administração e operacionalização técnico-cultural do novo Centro Cultural — PROEX - Gabinete',
          tipificacaoId: proexDfd.tipificacaoId,
          prioridadeId: proexDfd.prioridadeId,
          justificativa: 'Demanda primária da unidade PROEX para a gestão compartilhada, administração e operacionalização técnico-cultural do novo Centro Cultural da UERN no PCA 2027 (Processo SEI: 04410024.000946/2026-29). Setor contemplado: PROEX - Gabinete.',
          tipoDemanda: 'NOVA',
          dataEntrega: proexDfd.dataEntrega,
          status: 'AGUARDANDO_APROVACAO',
          enviadoParaAprovacaoEm: proexDfd.enviadoParaAprovacaoEm,
          criadoPorId: proexDfd.criadoPorId,
          processoSeiOrigem: proexDfd.processoSeiOrigem,
          idSeiDfdOrigem: null
        }
      });

      // Reatribuir o item do Centro Cultural ao novo DFD
      await prisma.itemDfd.update({
        where: { id: itemCentroCultural.id },
        data: { dfdId: novoDfd.id }
      });

      // Atualizar DFD remanescente do FESTUERN
      await prisma.dfd.update({
        where: { id: proexDfd.id },
        data: {
          descricaoSumaria: 'Planejamento e produção executiva do 21º Festival de Teatro (FESTUERN) — PROEX - Gabinete',
          justificativa: 'Demanda primária da unidade PROEX para planejamento e produção executiva do 21º Festival de Teatro da UERN (FESTUERN) no PCA 2027 (Processo SEI: 04410024.000946/2026-29). Setor contemplado: PROEX - Gabinete.'
        }
      });

      console.log(`Centro Cultural desmembrado com sucesso em novo DFD ${novoDfd.id} (Nº ${proximoNumero})`);
    } else {
      console.log('Centro Cultural já havia sido desmembrado ou não encontrado no DFD.');
    }
  }

  // 3. Atualizar descricaoSumaria de todos os demais DFDs em lotes de 10
  const itensParaAtualizar = previaData.filter(item => {
    if (item.dfdId === 'dfd27_a4b2741dcb7a93ae6e54' || item.dfdId === 'dfd27_centro_cultural_proex') return false;
    if (item.sei === '44897642') return false;
    return true;
  });

  console.log(`Atualizando ${itensParaAtualizar.length} DFDs em lotes...`);
  const chunkSize = 10;
  for (let i = 0; i < itensParaAtualizar.length; i += chunkSize) {
    const chunk = itensParaAtualizar.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(item =>
        prisma.dfd.update({
          where: { id: item.dfdId },
          data: { descricaoSumaria: item.tituloProposto }
        })
      )
    );
    process.stdout.write(`Progresso: ${Math.min(i + chunkSize, itensParaAtualizar.length)} / ${itensParaAtualizar.length}\r`);
  }
  console.log('\nTodos os títulos de DFD foram atualizados com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
