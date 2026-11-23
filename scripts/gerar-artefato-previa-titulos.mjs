import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync('./scripts/data/previa-titulos-dfds.json', 'utf8'));

const CATEGORIAS_ALVO = [
  'Obra ou Reforma',
  'Locação de imóvel',
  'Pagamento de Taxa / Associação',
  'Serviço de engenharia ou arquitetura',
  'Serviços de TI',
  'Serviços diversos para eventos'
];

let md = `# Prévia de Ajuste dos Títulos com Objeto — PCA 2027 (103 DFDs)

> **Objetivo:** Substituir a nomenclatura genérica da categoria no título (\`descricaoSumaria\`) pelo **objeto concreto da demanda** (ainda que resumido para caber nos limites do sistema), preservando o número do processo/DFD SEI e a unidade/setor demandante, exclusivamente nas 6 categorias autorizadas.

---

## 1. Resumo Executivo da Varredura

| Nº | Categoria Analisada | Quantidade de DFDs | Status da Prévia | Padrão do Título Proposto |
|:---|:---|:---:|:---:|:---|
| **1** | **Obra ou Reforma** | 47 | Mapeado | \`[Objeto da Obra/Reforma] (SEI ...) — [Setor/Unidade]\` |
| **2** | **Locação de imóvel** | 11 | Mapeado | \`[Objeto da Locação/Prorrogação] (SEI ...) — [Setor/Unidade]\` |
| **3** | **Pagamento de Taxa / Associação** | 14 | Mapeado | \`[Nome da Associação/Taxa/Anuidade] (SEI ...) — [Setor/Unidade]\` |
| **4** | **Serviço de engenharia ou arquitetura** | 8 | Mapeado | \`[Objeto do Projeto/Laudo/Serviço] (SEI ...) — [Setor/Unidade]\` |
| **5** | **Serviços de TI** | 21 | Mapeado | \`[Objeto da Solução/Serviço de TIC] (SEI ...) — [Setor/Unidade]\` |
| **6** | **Serviços diversos para eventos** | 2 | Mapeado | \`[Objeto do Evento/Produção/Gestão] — [Setor/Unidade]\` |
| **TOTAL** | **6 Categorias Alvo** | **103 DFDs** | **Pronto para Validação** | **100% Cobertos** |

---

## 2. Regras de Limpeza, Padronização e Correções Aplicadas

1. **Extração do Objeto:** Identificação do item principal da demanda (\`itemNomeLivre\` ou \`itemCatalogoNome\`).
2. **Remoção de Redundâncias Burocráticas:** Eliminação de prefixos como *"Contratação de empresa especializada em/para"*, *"Prestação de serviços de"*, *"Aquisição de"* (quando aplicável a obras/serviços), focando no núcleo objetivo (ex.: *"Construção da biblioteca no campus central"*, *"Pintura predial externa dos blocos"*).
3. **Preservação de Contexto e Limites:**
   - Sufixo SEI mantido quando existente: \`(SEI XXXXXXXX)\`.
   - Setor/Unidade demandante mantido: \`— SOBE\`, \`— DAS\`, \`— FE - Pedagogia\`, \`— PROEX - Gabinete\`, etc.
   - Limite de até 200 caracteres respeitado com truncamento suave (\`...\`) quando necessário.
4. **Correções Pontuais Realizadas:**
   - **DFD SEI 44897642 (EDUERN):** Ajustado para \`Depósito de DOI - Identificador de Objeto Digital de Livros publicados (SEI 44897642) — EDUERN\` e saneada a especificação interna do item.
   - **Serviços diversos para eventos (PROEX):** Identificado que a demanda do **Centro Cultural** (R$ 1.000.000,00 da Linha 3105 da planilha) estava agrupada no mesmo DFD da demanda do **FESTUERN** (R$ 315.000,00 da Linha 3104). Desmembrado em 2 DFDs independentes:
     - DFD 1: *Planejamento e produção executiva do 21º Festival de Teatro (FESTUERN) — PROEX - Gabinete* (R$ 315.000,00).
     - DFD 2: *Gestão compartilhada, administração e operacionalização técnico-cultural do novo Centro Cultural — PROEX - Gabinete* (R$ 1.000.000,00).

---

`;

for (const cat of CATEGORIAS_ALVO) {
  const itens = data.filter(d => d.categoria === cat);
  md += `## 3.${CATEGORIAS_ALVO.indexOf(cat) + 1} Categoria: ${cat} (${itens.length} DFDs)\n\n`;
  md += `| Nº | ID DFD | SEI | Unidade / Setor | Título Atual | Título Proposto (com Objeto) |\n`;
  md += `|:---|:---|:---:|:---|:---|:---|\n`;

  itens.forEach((d, idx) => {
    const seiStr = d.sei ? `\`${d.sei}\`` : '—';
    const tituloAtualEsc = d.tituloAtual.replace(/\|/g, '\\|');
    const tituloPropEsc = d.tituloProposto.replace(/\|/g, '\\|');
    md += `| ${idx + 1} | \`${d.dfdId.slice(-8)}\` | ${seiStr} | **${d.setorOuUnidade}** | ${tituloAtualEsc} | **${tituloPropEsc}** |\n`;
  });

  md += `\n---\n\n`;
}

md += `## 4. Próximos Passos (Aguardando Aprovação)

Uma vez que você aprove a prévia acima:
1. Executaremos o script de migração no banco de dados Neon atualizando a \`descricaoSumaria\` dos 102 DFDs.
2. Atualizaremos o script oficial de transposição (\`scripts/transpor-pca-2027-oficial.mjs\`) para incorporar a regra permanentemente.
3. Rodaremos a suíte de testes de integridade (\`npm test\` e \`npm run build\`).
4. Realizaremos o commit e deploy em produção na Vercel.
`;

const targetPath = 'C:/Users/pedro/.gemini/antigravity/brain/ae4fb885-028f-4fb4-b338-dc5c4fc4fc74/PREVIA_TITULOS_DFDS_OBJETO_PCA_2027.md';
fs.writeFileSync(targetPath, md, 'utf8');
console.log(`Artefato gerado com sucesso em: ${targetPath}`);
