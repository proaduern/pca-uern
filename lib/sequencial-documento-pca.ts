import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type TipoDocumentoPca =
  | "EDITAL"
  | "TERMO_REFERENCIA"
  | "ETP"
  | "MAPA_RISCOS"
  | "IMR"
  | "MINUTA_CONTRATO"
  | "MINUTA_ATA"
  | "LISTA_VERIFICACAO";

export function obterRotuloTipoDocumentoPca(tipo: string): string {
  const t = (tipo || "").toUpperCase().trim();
  switch (t) {
    case "EDITAL":
      return "Edital";
    case "TERMO_REFERENCIA":
    case "TR":
      return "Termo de Referência";
    case "ETP":
      return "Estudo Técnico Preliminar";
    case "MAPA_RISCOS":
    case "RISCOS":
      return "Mapa de Riscos";
    case "IMR":
      return "Instrumento de Medição de Resultado";
    case "MINUTA_CONTRATO":
    case "CONTRATO":
      return "Minuta de Contrato";
    case "MINUTA_ATA":
    case "ATA":
    case "ARP":
      return "Minuta de Ata de Registro de Preços";
    case "LISTA_VERIFICACAO":
    case "CHECKLIST":
      return "Lista de Verificação AGU";
    default:
      return "Documento";
  }
}

export function formatarTextoDocumentoPca(
  tipo: string,
  numero: number | string,
  ano?: number | string,
): string {
  const rotulo = obterRotuloTipoDocumentoPca(tipo);
  const anoAtual = ano ? parseInt(String(ano), 10) : new Date().getFullYear();

  let numInt = 1;
  if (typeof numero === "number") {
    numInt = numero;
  } else {
    const match = String(numero || "").match(/(\d+)/);
    if (match) {
      numInt = parseInt(match[1], 10);
    }
  }

  const numFormatado = String(numInt).padStart(2, "0");
  const orgaoEmissor =
    tipo === "ETP" || tipo === "MAPA_RISCOS" || tipo === "IMR"
      ? "PROAD/UERN"
      : "DLC/PROAD/UERN";

  return `${rotulo} nº ${numFormatado}/${anoAtual} - ${orgaoEmissor}`;
}

export function formatarNumeroAnoPca(numero: number | string, ano?: number | string): string {
  const anoAtual = ano ? parseInt(String(ano), 10) : new Date().getFullYear();
  let numInt = 1;
  if (typeof numero === "number") {
    numInt = numero;
  } else {
    const match = String(numero || "").match(/(\d+)/);
    if (match) {
      numInt = parseInt(match[1], 10);
    }
  }
  const numFormatado = String(numInt).padStart(2, "0");
  return `${numFormatado}/${anoAtual}`;
}

/**
 * Consulta o próximo sequencial sem consumi-lo (para pré-visualização)
 */
export async function obterProximoSequencialPca(tipo: string, anoParam?: number) {
  const t = (tipo || "DOCUMENTO").toUpperCase().trim();
  const ano = anoParam || new Date().getFullYear();

  const registro = await prisma.sequencialDocumentoPca.findUnique({
    where: {
      tipo_ano: { tipo: t, ano },
    },
  });

  const proximoNumero = (registro?.ultimoNumero || 0) + 1;
  const numeroFormatado = String(proximoNumero).padStart(2, "0");

  return {
    tipo: t,
    rotuloTipo: obterRotuloTipoDocumentoPca(t),
    ano,
    proximoNumero,
    numeroFormatado,
    identificador: `${numeroFormatado}/${ano}`,
    tituloCompleto: formatarTextoDocumentoPca(t, proximoNumero, ano),
  };
}

/**
 * Reserva e incrementa de forma ATÔMICA o sequencial no PostgreSQL
 * usando INSERT ... ON CONFLICT DO UPDATE RETURNING.
 */
export async function reservarProximoSequencialPca(
  tipo: string,
  anoParam?: number,
  numeroEspecifico?: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = prisma,
) {
  const t = (tipo || "DOCUMENTO").toUpperCase().trim();
  const ano = anoParam || new Date().getFullYear();
  const minFloor = numeroEspecifico && numeroEspecifico > 0 ? numeroEspecifico : 1;
  const newId = crypto.randomUUID();

  const rows = await dbClient.$queryRaw`
    INSERT INTO pca."sequenciais_documentos_pca" ("id", "tipo", "ano", "ultimoNumero", "updatedAt")
    VALUES (${newId}, ${t}, ${ano}, ${minFloor}, NOW())
    ON CONFLICT ("tipo", "ano")
    DO UPDATE SET
      "ultimoNumero" = GREATEST(pca."sequenciais_documentos_pca"."ultimoNumero" + 1, ${minFloor}),
      "updatedAt" = NOW()
    RETURNING "ultimoNumero"
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const numeroReservado = (rows as any)?.[0]?.ultimoNumero ?? minFloor;
  const numFormatado = String(numeroReservado).padStart(2, "0");

  return {
    tipo: t,
    rotuloTipo: obterRotuloTipoDocumentoPca(t),
    ano,
    numero: numeroReservado,
    numeroFormatado: numFormatado,
    identificador: `${numFormatado}/${ano}`,
    tituloCompleto: formatarTextoDocumentoPca(t, numeroReservado, ano),
  };
}
