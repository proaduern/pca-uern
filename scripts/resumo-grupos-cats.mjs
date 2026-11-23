import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./scripts/data/itens-4-categorias.json', 'utf8'));

console.log('=== 1. COFFEE BREAK ===');
const coffee = data['Serviços de Fornecimento de Coffee break'];
coffee.forEach((c, idx) => {
  console.log(`[${idx+1}] Qtd: ${c.qtd} | Unit: R$ ${c.unit.toFixed(2)} | Total: R$ ${c.total.toFixed(2)} | Unidade: ${c.unidade}`);
  console.log(`     ${c.nome.replace(/\s+/g, ' ').slice(0, 140)}`);
});

console.log('\n=== 2. TENDAS ===');
const tendas = data['Serviços diversos para eventos - Tendas Tamanhos Diversos'];
tendas.forEach((t, idx) => {
  console.log(`[${idx+1}] Qtd: ${t.qtd} | Unit: R$ ${t.unit.toFixed(2)} | Total: R$ ${t.total.toFixed(2)} | Unidade: ${t.unidade}`);
  console.log(`     ${t.nome.replace(/\s+/g, ' ').slice(0, 140)}`);
});

console.log('\n=== 3. SERVIÇOS SERIGRÁFICOS ===');
const seri = data['Serviços Serigráficos'];
seri.forEach((s, idx) => {
  console.log(`[${idx+1}] Qtd: ${s.qtd} | Unit: R$ ${s.unit.toFixed(2)} | Total: R$ ${s.total.toFixed(2)} | Unidade: ${s.unidade}`);
  console.log(`     ${s.nome.replace(/\s+/g, ' ').slice(0, 140)}`);
});
