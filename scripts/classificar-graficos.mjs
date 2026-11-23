import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./scripts/data/itens-4-categorias.json', 'utf8'));
const graficos = data['Serviços Gráficos'];

const cats = {
  'Banner': [],
  'Wind Banner': [],
  'Faixa': [],
  'Backdrop / Lona': [],
  'Folder': [],
  'Panfleto / Flyer': [],
  'Cartaz': [],
  'Crachá / Cordão': [],
  'Bloco / Caderno': [],
  'Pasta': [],
  'Adesivo': [],
  'Caneta / Brinde': [],
  'Troféu / Medalha': [],
  'Chaveiro': [],
  'Sacola': [],
  'Outros': []
};

graficos.forEach(it => {
  const n = it.nome.toLowerCase();
  if (n.includes('wind banner')) cats['Wind Banner'].push(it);
  else if (n.includes('banner')) cats['Banner'].push(it);
  else if (n.includes('faixa')) cats['Faixa'].push(it);
  else if (n.includes('backdrop')) cats['Backdrop / Lona'].push(it);
  else if (n.includes('folder')) cats['Folder'].push(it);
  else if (n.includes('panfleto') || n.includes('flyer')) cats['Panfleto / Flyer'].push(it);
  else if (n.includes('cartaz')) cats['Cartaz'].push(it);
  else if (n.includes('crachá') || n.includes('cracha') || n.includes('cordão')) cats['Crachá / Cordão'].push(it);
  else if (n.includes('bloco') || n.includes('caderno')) cats['Bloco / Caderno'].push(it);
  else if (n.includes('pasta')) cats['Pasta'].push(it);
  else if (n.includes('adesivo')) cats['Adesivo'].push(it);
  else if (n.includes('caneta')) cats['Caneta / Brinde'].push(it);
  else if (n.includes('troféu') || n.includes('trofeu') || n.includes('medalha')) cats['Troféu / Medalha'].push(it);
  else if (n.includes('chaveiro')) cats['Chaveiro'].push(it);
  else if (n.includes('sacola') || n.includes('ecobag')) cats['Sacola'].push(it);
  else cats['Outros'].push(it);
});

for (const [k, v] of Object.entries(cats)) {
  console.log(`\n=== ${k} (${v.length} ocorrências) ===`);
  const amostras = v.slice(0, 3);
  amostras.forEach(it => {
    console.log(`  - Qtd: ${it.qtd} | Unit: R$ ${it.unit.toFixed(2)} | Desc: ${it.nome.slice(0, 80).replace(/\s+/g, ' ')}`);
  });
}
