import { syncSchema } from "./sync-schema.mjs";
import { transporPca2027Oficial } from "./transpor-pca-2027-oficial.mjs";
import { sanearPrioridadesETipificacoes } from "./sanear-prioridades-e-tipificacoes.mjs";
import { seedCatalogo4Servicos } from "./seed-catalogo-4-servicos.mjs";

async function main() {
  console.log("[Deploy Migrations] Iniciando sincronização e migrações no deploy...");
  try {
    await syncSchema();
  } catch (e) {
    console.warn("[Deploy Migrations] Aviso no syncSchema:", e);
  }

  try {
    await transporPca2027Oficial();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no transporPca2027Oficial:", e);
  }

  try {
    await sanearPrioridadesETipificacoes();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no sanearPrioridadesETipificacoes:", e);
  }

  try {
    await seedCatalogo4Servicos();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no seedCatalogo4Servicos:", e);
  }
}

main();
