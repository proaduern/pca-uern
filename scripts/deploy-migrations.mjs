import { syncSchema } from "./sync-schema.mjs";
import { transporPca2027Oficial } from "./transpor-pca-2027-oficial.mjs";

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
}

main();
