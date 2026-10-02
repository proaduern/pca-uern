import { execSync } from "child_process";

const MAX_TENTATIVAS = 4;
const INTERVALO_MS = 6000;

async function executarMigracoes() {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      console.log(`[Deploy] Executando prisma migrate deploy (tentativa ${tentativa}/${MAX_TENTATIVAS})...`);
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      console.log("[Deploy] Migrações aplicadas com sucesso!");
      return;
    } catch (err) {
      if (tentativa === MAX_TENTATIVAS) {
        console.error("[Deploy] Falha ao aplicar migrações após todas as tentativas.");
        throw err;
      }
      console.warn(
        `[Deploy] Aviso: Banco temporariamente inacessível (inicialização/cold start do Neon). Aguardando ${INTERVALO_MS / 1000}s para retentar...`
      );
      await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
    }
  }
}

executarMigracoes().catch((err) => {
  console.error(err);
  process.exit(1);
});
