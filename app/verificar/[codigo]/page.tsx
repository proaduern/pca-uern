import Link from "next/link";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";

export const dynamic = "force-dynamic";

const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  DFD: "Documento de Formalização da Demanda (DFD)",
  DFD_CONSOLIDADO: "Documento de Formalização da Demanda Consolidado (DFD Consolidado)",
  ETP: "Estudo Técnico Preliminar (ETP)",
  MAPA_RISCOS: "Mapa de Gerenciamento de Riscos",
  PESQUISA_PRECOS: "Relatório de Pesquisa de Preços",
  TERMO_REFERENCIA: "Termo de Referência (TR)",
  MINUTA_EDITAL: "Minuta do Edital de Licitação",
  PCA_CONSOLIDADO: "Plano de Contratações Anual Consolidado (PCA)",
  RELATORIO_ITENS: "Relatório Geral de Itens Demandados",
  SGC_DOCUMENTO: "Documento Oficial — Sistema de Gestão de Contratos (SGC-UERN)",
  CLIMATIZACAO_DOCUMENTO: "Relatório Oficial — Sistema de Climatização (PROAD/UERN)",
};

export default async function VerificarCodigoPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { codigo } = await params;
  const { t } = await searchParams;
  const codigoNormalizado = decodeURIComponent(codigo).trim().toUpperCase();

  let doc = await prisma.documentoAutenticado.findUnique({
    where: { codigoVerificador: codigoNormalizado },
  });

  if (!doc && t) {
    try {
      const jsonStr = Buffer.from(t, "base64url").toString("utf-8");
      const parsed = JSON.parse(jsonStr) as {
        tipo?: string;
        titulo?: string;
        ref?: string;
        sei?: string;
        setor?: string;
        resp?: string;
        ts?: string;
      };
      if (parsed && parsed.titulo) {
        const hashSha256 = crypto
          .createHash("sha256")
          .update(`${codigoNormalizado}:${jsonStr}`)
          .digest("hex");
        doc = await prisma.documentoAutenticado.upsert({
          where: { codigoVerificador: codigoNormalizado },
          create: {
            codigoVerificador: codigoNormalizado,
            hashSha256,
            tipoDocumento: parsed.tipo || "SGC_DOCUMENTO",
            titulo: parsed.titulo,
            referenciaId: parsed.ref || codigoNormalizado,
            processoSEI: parsed.sei || null,
            unidadeOuSetor: parsed.setor || "PROAD / UERN",
            responsavelNome: parsed.resp || null,
          },
          update: {},
        });
      }
    } catch {
      // ignora token malformado
    }
  }

  let resumoExtra: Record<string, unknown> | null = null;
  if (doc?.resumoJson) {
    try {
      resumoExtra = JSON.parse(doc.resumoJson);
    } catch {
      resumoExtra = null;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN
            </span>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Verificação Pública de Autenticidade de Documento
            </h1>
            <p className="text-xs text-slate-500">
              Pró-Reitoria de Administração (PROAD) · Ecossistema Integrado PROAD / PCA / SGC
            </p>
          </div>
        </div>

        {doc ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  ✓
                </span>
                <div>
                  <h2 className="text-sm font-bold text-emerald-950">
                    DOCUMENTO AUTÊNTICO E VÁLIDO
                  </h2>
                  <p className="text-xs text-emerald-800">
                    Este documento foi emitido oficialmente pelo ecossistema de sistemas da PROAD/UERN
                    e sua assinatura de integridade consta na base oficial.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-xs font-medium text-slate-500">Código Verificador</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {doc.codigoVerificador}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500">Tipo de Documento</span>
                <span className="font-semibold text-slate-900">
                  {TIPO_DOCUMENTO_LABEL[doc.tipoDocumento] ?? doc.tipoDocumento}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-xs font-medium text-slate-500">
                  Identificação / Título do Documento
                </span>
                <span className="font-semibold text-slate-900">{doc.titulo}</span>
              </div>
              {doc.processoSEI && (
                <div>
                  <span className="block text-xs font-medium text-slate-500">Processo SEI</span>
                  <span className="font-medium text-slate-900">{doc.processoSEI}</span>
                </div>
              )}
              {doc.unidadeOuSetor && (
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Unidade / Setor Responsável
                  </span>
                  <span className="font-medium text-slate-900">{doc.unidadeOuSetor}</span>
                </div>
              )}
              {doc.responsavelNome && (
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Servidor Responsável
                  </span>
                  <span className="font-medium text-slate-900">
                    {doc.responsavelNome}
                    {doc.responsavelMatricula ? ` (Mat. ${doc.responsavelMatricula})` : ""}
                  </span>
                </div>
              )}
              {doc.valorTotal != null && (
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Valor Total Estimado
                  </span>
                  <span className="font-semibold text-slate-900">
                    {brl(Number(doc.valorTotal))}
                  </span>
                </div>
              )}
              <div>
                <span className="block text-xs font-medium text-slate-500">
                  Data/Hora da Última Emissão Oficial
                </span>
                <span className="font-medium text-slate-900">
                  {new Date(doc.updatedAt).toLocaleString("pt-BR", {
                    timeZone: "America/Fortaleza",
                  })}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500">
                  Primeira Emissão Registrada
                </span>
                <span className="font-medium text-slate-900">
                  {new Date(doc.emitidoEm).toLocaleString("pt-BR", {
                    timeZone: "America/Fortaleza",
                  })}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-xs font-medium text-slate-500">
                  Hash Criptográfico de Integridade (SHA-256)
                </span>
                <span className="break-all font-mono text-xs text-slate-700">{doc.hashSha256}</span>
              </div>
            </div>

            {resumoExtra && Object.keys(resumoExtra).length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Metadados Adicionais do Documento
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  {Object.entries(resumoExtra).map(([chave, valor]) => (
                    <div key={chave}>
                      <dt className="font-medium text-slate-500">{chave}</dt>
                      <dd className="font-semibold text-slate-800">{String(valor ?? "—")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-300 bg-red-50 p-4">
              <h2 className="text-sm font-bold text-red-900">
                CÓDIGO VERIFICADOR NÃO ENCONTRADO ({codigoNormalizado})
              </h2>
              <p className="mt-1 text-xs text-red-800">
                Não foi localizado nenhum documento oficial emitido pelo Sistema PCA UERN com o
                código verificador informado. Verifique se o código foi digitado corretamente.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Link
            href="/verificar"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Consultar outro código
          </Link>
          <Link href="/" className="text-xs font-medium text-blue-700 hover:underline">
            Acessar Sistema PCA UERN
          </Link>
        </div>
      </div>
    </main>
  );
}
