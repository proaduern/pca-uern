import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const CATEGORIAS_ALVO = [
  'Obra ou Reforma',
  'Locação de imóvel',
  'Pagamento de Taxa / Associação',
  'Serviço de engenharia ou arquitetura',
  'Serviços de TI',
  'Serviços diversos para eventos'
];

// Função para limpar e resumir o objeto de forma inteligente e concisa
function resumirObjeto(desc, catNome, unidadeOuSetor, sei) {
  if (sei === '44897642') {
    return 'Depósito de DOI - Identificador de Objeto Digital de Livros publicados';
  }
  if (!desc) return catNome;
  let limpo = desc.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Caso especial: texto preenchido incorretamente com justificativa de prioridade na planilha original
  if (/curso\/setor\/atividade essencial pode parar/i.test(limpo)) {
    return 'Depósito de DOI - Identificador de Objeto Digital de Livros publicados';
  }

  // Caso especial Centro Cultural
  if (/gestão compartilhada.*Centro Cultural/i.test(limpo)) {
    return 'Gestão compartilhada, administração e operacionalização técnico-cultural do novo Centro Cultural';
  }

  // Caso especial FESTUERN
  if (/Festival de Teatro.*FESTUERN/i.test(limpo)) {
    return 'Planejamento e produção executiva do 21º Festival de Teatro (FESTUERN)';
  }

  // Remover prefixos burocráticos redundantes mantendo o núcleo do objeto
  limpo = limpo
    .replace(/^contratação\s+((de|e)\s+)?(uma\s+)?(empresa|instituição|pessoa\s+jurídica)\s+(especializada\s+)?((em|para|na)\s+)?((na\s+)?prestação\s+de\s+serviços\s+(de|para|em)?)?\s*/i, '')
    .replace(/^contratação\s+((de|e)\s+)?(serviços?|soluções?|plataforma|ferramenta)\s+(especializados?|digitais?)?\s*(em|de|para)?\s*/i, '')
    .replace(/^contratação\s+((de|e)\s+)?/i, '')
    .replace(/^(na\s+)?prestação\s+de\s+serviços?\s+(de\s+|para\s+|em\s+)?/i, '')
    .replace(/^aquisição\s+(de\s+)?/i, '')
    .replace(/^(em|para|na)\s+/i, '')
    .trim();

  // Se começou com "serviços de" ou "serviço de", pode remover se o que segue for um verbo ou substantivo claro
  if (/^serviços?\s+(especializados?\s+)?(de|em|para)\s+/i.test(limpo)) {
    const semServico = limpo.replace(/^serviços?\s+(especializados?\s+)?(de|em|para)\s+/i, '').trim();
    if (semServico.length > 10) {
      limpo = semServico;
    }
  }

  // Se o texto for muito longo (> 120 caracteres) e contiver ponto final de frase (não abreviação como "n.", "art.")
  // Ex: "Forro de teto com isolamento acústico para estúdios de rádio e TV da UERN. Fornecer forro acústico..."
  if (limpo.length > 120) {
    const match = limpo.match(/(?<!\b(n|art|fl|av|sr|sra|prof|dr|dra|ed|v|cap))\.\s+([A-ZÀ-Ú])/);
    if (match && match.index > 25 && match.index < 120) {
      limpo = limpo.slice(0, match.index).trim();
    }
  }

  // Ajustes de pontuação final solta
  limpo = limpo.replace(/[\.;,\s]+$/, '').trim();

  // Primeira letra maiúscula
  limpo = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  return limpo;
}

// Montar título formatado com até 200 caracteres
function formatarTitulo(objeto, sufixoSei, setorOuUnidade) {
  // Modelo: "[Objeto Resumido] (SEI ...) — [Setor/Unidade]"
  const seiPart = sufixoSei ? ` (${sufixoSei})` : '';
  const unidadePart = setorOuUnidade ? ` — ${setorOuUnidade}` : '';

  // Limite máximo de 200 caracteres (ou margem de segurança de 180)
  const maxObjetoLen = 200 - seiPart.length - unidadePart.length;
  let objResumido = objeto;
  if (objResumido.length > maxObjetoLen) {
    objResumido = objResumido.slice(0, maxObjetoLen - 3).trim() + '...';
  }

  return `${objResumido}${seiPart}${unidadePart}`;
}

async function main() {
  const dfds = await prisma.dfd.findMany({
    where: {
      ano: 2027,
      itens: {
        some: {
          categoria: {
            nome: { in: CATEGORIAS_ALVO }
          }
        }
      }
    },
    include: {
      unidade: { select: { id: true, nome: true } },
      itens: {
        select: {
          id: true,
          categoria: { select: { nome: true } },
          itemNomeLivre: true,
          itemCatalogoNome: true,
          valorTotal: true,
          idSeiDfdOrigem: true
        }
      }
    },
    orderBy: [
      { id: 'asc' }
    ]
  });

  console.log(`Carregados ${dfds.length} DFDs.`);

  const resultado = [];

  for (const d of dfds) {
    const catNome = d.itens[0]?.categoria?.nome ?? 'Desconhecido';
    
    // Obter descrição/objeto dos itens do DFD
    const descricoes = d.itens
      .map(it => it.itemNomeLivre || it.itemCatalogoNome || '')
      .filter(Boolean);

    const objetoOriginal = descricoes.join('; ');
    const sei = d.idSeiDfdOrigem || d.itens[0]?.idSeiDfdOrigem || null;
    const sufixoSei = sei ? `SEI ${sei}` : null;

    // Preservar o setor/unidade original da descrição sumária atual
    const partesAtual = d.descricaoSumaria.split(' — ');
    const setorOuUnidade = partesAtual.length > 1 ? partesAtual.slice(1).join(' — ') : d.unidade.nome;

    // Caso especial PROEX: DFD com 2 itens agrupados (FESTUERN + Centro Cultural) que devem ser separados
    if (d.id === 'dfd27_a4b2741dcb7a93ae6e54' && d.itens.length > 1) {
      for (const item of d.itens) {
        const itemObjResumido = resumirObjeto(item.itemNomeLivre || item.itemCatalogoNome, catNome, setorOuUnidade, sei);
        const itemTituloProposto = formatarTitulo(itemObjResumido, sufixoSei, setorOuUnidade);
        const ehCentroCultural = /Centro Cultural/i.test(item.itemNomeLivre || '');
        resultado.push({
          dfdId: ehCentroCultural ? 'dfd27_centro_cultural_proex' : d.id,
          categoria: catNome,
          unidade: d.unidade.nome,
          setorOuUnidade,
          sei: sei,
          tituloAtual: ehCentroCultural ? '(Item agrupado no DFD da PROEX)' : d.descricaoSumaria,
          objetoOriginal: item.itemNomeLivre || '',
          objetoResumido: itemObjResumido,
          tituloProposto: itemTituloProposto,
          tamanhoTitulo: itemTituloProposto.length,
          valorTotal: Number(item.valorTotal)
        });
      }
      continue;
    }

    const objetoResumido = resumirObjeto(descricoes[0], catNome, setorOuUnidade, sei);
    const tituloProposto = formatarTitulo(objetoResumido, sufixoSei, setorOuUnidade);

    resultado.push({
      dfdId: d.id,
      categoria: catNome,
      unidade: d.unidade.nome,
      setorOuUnidade,
      sei: sei,
      tituloAtual: d.descricaoSumaria,
      objetoOriginal,
      objetoResumido,
      tituloProposto,
      tamanhoTitulo: tituloProposto.length
    });
  }

  fs.writeFileSync('./scripts/data/previa-titulos-dfds.json', JSON.stringify(resultado, null, 2));
  console.log('Gravado em ./scripts/data/previa-titulos-dfds.json');

  // Imprimir resumo por categoria
  for (const cat of CATEGORIAS_ALVO) {
    const lista = resultado.filter(r => r.categoria === cat);
    console.log(`\n======================================================`);
    console.log(`CATEGORIA: ${cat} (${lista.length} DFDs)`);
    console.log(`======================================================`);
    for (let i = 0; i < Math.min(5, lista.length); i++) {
      const item = lista[i];
      console.log(`\n[${i + 1}] ID: ${item.dfdId} | Unidade: ${item.unidade}`);
      console.log(`    Atual:    "${item.tituloAtual}"`);
      console.log(`    Proposto: "${item.tituloProposto}" (${item.tamanhoTitulo} carac.)`);
    }
    if (lista.length > 5) {
      console.log(`    ... e mais ${lista.length - 5} DFDs nesta categoria.`);
    }
  }
}

main().finally(() => prisma.$disconnect());
