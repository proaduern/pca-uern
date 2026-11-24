import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function gerarId(prefix = 'dfd27') {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

export async function aplicarTitulosDfdsESeparacao(prismaClient) {
  const prisma = prismaClient || new PrismaClient();
  console.log('[Titulos & Separação] Iniciando verificação e aplicação dos títulos com objeto e Centro Cultural...');

  // 1. EDUERN SEI 44897642
  try {
    const eduernDfd = await prisma.dfd.findFirst({
      where: {
        ano: 2027,
        OR: [
          { idSeiDfdOrigem: '44897642' },
          { idSeiDfdOrigem: { contains: '44897642' } }
        ]
      },
      include: { itens: true }
    });

    if (eduernDfd) {
      console.log(`[Titulos] Atualizando DFD EDUERN ${eduernDfd.id}...`);
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
      console.log('[Titulos] DFD e Item da EDUERN atualizados com sucesso.');
    }
  } catch (err) {
    console.warn('[Titulos] Aviso ao atualizar EDUERN:', err.message);
  }

  // 2. Separação do Centro Cultural na PROEX
  try {
    let proexDfd = await prisma.dfd.findUnique({
      where: { id: 'dfd27_a4b2741dcb7a93ae6e54' },
      include: { itens: true, unidade: true }
    });

    if (!proexDfd) {
      proexDfd = await prisma.dfd.findFirst({
        where: {
          ano: 2027,
          unidade: { nome: { contains: 'PROEX', mode: 'insensitive' } },
          itens: {
            some: {
              itemNomeLivre: { contains: 'Centro Cultural', mode: 'insensitive' }
            }
          }
        },
        include: { itens: true, unidade: true }
      });
    }

    if (proexDfd) {
      const itemCentroCultural = proexDfd.itens.find(it => /Centro Cultural/i.test(it.itemNomeLivre || ''));

      if (itemCentroCultural && proexDfd.itens.length > 1) {
        console.log(`[Separação] Desmembrando Centro Cultural de DFD ${proexDfd.id}...`);

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

        console.log(`[Separação] Centro Cultural desmembrado com sucesso em novo DFD ${novoDfd.id} (Nº ${proximoNumero})`);
      } else {
        console.log('[Separação] Centro Cultural já desmembrado ou não encontrado no DFD.');
      }
    }
  } catch (err) {
    console.warn('[Separação] Aviso na separação do Centro Cultural:', err.message);
  }

  // 3. Atualizar títulos de DFDs das categorias alvo
  const previaPath = path.resolve(__dirname, 'data/previa-titulos-dfds.json');
  if (fs.existsSync(previaPath)) {
    const previaData = JSON.parse(fs.readFileSync(previaPath, 'utf8'));
    console.log(`[Titulos] Verificando ${previaData.length} DFDs com títulos propostos...`);

    let atualizados = 0;
    for (const item of previaData) {
      if (item.dfdId === 'dfd27_a4b2741dcb7a93ae6e54' || item.dfdId === 'dfd27_centro_cultural_proex') continue;
      if (item.sei === '44897642') continue;

      try {
        let targetDfd = await prisma.dfd.findUnique({
          where: { id: item.dfdId },
          select: { id: true, descricaoSumaria: true }
        });

        if (!targetDfd && item.sei) {
          targetDfd = await prisma.dfd.findFirst({
            where: {
              ano: 2027,
              OR: [
                { idSeiDfdOrigem: item.sei },
                { idSeiDfdOrigem: { contains: item.sei } }
              ],
              unidade: { nome: { contains: item.unidade, mode: 'insensitive' } }
            },
            select: { id: true, descricaoSumaria: true }
          });
        }

        if (targetDfd && targetDfd.descricaoSumaria !== item.tituloProposto) {
          await prisma.dfd.update({
            where: { id: targetDfd.id },
            data: { descricaoSumaria: item.tituloProposto }
          });
          atualizados++;
        }
      } catch (err) {
        console.warn(`[Titulos] Erro ao atualizar item ${item.dfdId}:`, err.message);
      }
    }
    console.log(`[Titulos] Concluído! ${atualizados} títulos de DFDs foram atualizados.`);
  }

  if (!prismaClient) {
    await prisma.$disconnect();
  }
}

// Se executado diretamente:
if (process.argv[1] && process.argv[1].includes('aplicar-titulos-dfds-e-separacao')) {
  aplicarTitulosDfdsESeparacao()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
