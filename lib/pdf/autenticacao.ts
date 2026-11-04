import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface DadosAutenticacaoPdf {
  codigoVerificador: string;
  hashSha256: string;
  urlVerificacao: string;
  emitidoEmFormatado: string;
  tipoDocumento: string;
}

export interface RegistrarAutenticacaoInput {
  tipoDocumento: string;
  referenciaId: string;
  titulo: string;
  processoSEI?: string | null;
  unidadeOuSetor?: string | null;
  responsavelNome?: string | null;
  responsavelMatricula?: string | null;
  valorTotal?: number | null;
  resumo?: Record<string, unknown>;
}

function gerarCodigoVerificadorDeterministico(tipoDocumento: string, referenciaId: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`UERN-PCA-AUTH:${tipoDocumento}:${referenciaId}`)
    .digest("hex")
    .toUpperCase();
  return `${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
}

export async function registrarAutenticacaoPdf(
  input: RegistrarAutenticacaoInput,
): Promise<DadosAutenticacaoPdf> {
  const codigoVerificador = gerarCodigoVerificadorDeterministico(
    input.tipoDocumento,
    input.referenciaId,
  );

  const payloadParaHash = JSON.stringify({
    tipoDocumento: input.tipoDocumento,
    referenciaId: input.referenciaId,
    titulo: input.titulo,
    processoSEI: input.processoSEI ?? null,
    unidadeOuSetor: input.unidadeOuSetor ?? null,
    responsavelNome: input.responsavelNome ?? null,
    responsavelMatricula: input.responsavelMatricula ?? null,
    valorTotal: input.valorTotal ?? null,
    resumo: input.resumo ?? null,
  });

  const hashSha256 = crypto.createHash("sha256").update(payloadParaHash).digest("hex");
  const agora = new Date();
  const emitidoEmFormatado = agora.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://pca-uern.vercel.app").replace(
    /\/$/,
    "",
  );
  const urlVerificacao = `${baseUrl}/verificar/${codigoVerificador}`;

  try {
    await prisma.documentoAutenticado.upsert({
      where: {
        tipoDocumento_referenciaId: {
          tipoDocumento: input.tipoDocumento,
          referenciaId: input.referenciaId,
        },
      },
      create: {
        codigoVerificador,
        hashSha256,
        tipoDocumento: input.tipoDocumento,
        titulo: input.titulo,
        referenciaId: input.referenciaId,
        processoSEI: input.processoSEI ?? null,
        unidadeOuSetor: input.unidadeOuSetor ?? null,
        responsavelNome: input.responsavelNome ?? null,
        responsavelMatricula: input.responsavelMatricula ?? null,
        valorTotal: input.valorTotal != null ? input.valorTotal : null,
        resumoJson: input.resumo ? JSON.stringify(input.resumo) : null,
      },
      update: {
        hashSha256,
        titulo: input.titulo,
        processoSEI: input.processoSEI ?? null,
        unidadeOuSetor: input.unidadeOuSetor ?? null,
        responsavelNome: input.responsavelNome ?? null,
        responsavelMatricula: input.responsavelMatricula ?? null,
        valorTotal: input.valorTotal != null ? input.valorTotal : null,
        resumoJson: input.resumo ? JSON.stringify(input.resumo) : null,
      },
    });
  } catch (err) {
    console.warn("[registrarAutenticacaoPdf] Aviso ao gravar DocumentoAutenticado:", err);
  }

  return {
    codigoVerificador,
    hashSha256,
    urlVerificacao,
    emitidoEmFormatado,
    tipoDocumento: input.tipoDocumento,
  };
}
