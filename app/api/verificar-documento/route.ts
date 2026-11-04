import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const codigo = (searchParams.get("codigo") || "").trim().toUpperCase();
  if (!codigo) {
    return NextResponse.json(
      { erro: "Código verificador não informado." },
      { status: 400, headers: corsHeaders },
    );
  }

  const doc = await prisma.documentoAutenticado.findUnique({
    where: { codigoVerificador: codigo },
  });

  if (!doc) {
    return NextResponse.json(
      { autentico: false, codigoVerificador: codigo },
      { status: 404, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    {
      autentico: true,
      documento: {
        ...doc,
        valorTotal: doc.valorTotal != null ? Number(doc.valorTotal) : null,
      },
    },
    { headers: corsHeaders },
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tipoDocumento,
      referenciaId,
      titulo,
      processoSEI,
      unidadeOuSetor,
      responsavelNome,
      responsavelMatricula,
      valorTotal,
      resumo,
    } = body ?? {};

    if (!tipoDocumento || !referenciaId || !titulo) {
      return NextResponse.json(
        { erro: "Campos obrigatórios: tipoDocumento, referenciaId, titulo" },
        { status: 400, headers: corsHeaders },
      );
    }

    const autenticacao = await registrarAutenticacaoPdf({
      tipoDocumento: String(tipoDocumento),
      referenciaId: String(referenciaId),
      titulo: String(titulo),
      processoSEI: processoSEI ? String(processoSEI) : null,
      unidadeOuSetor: unidadeOuSetor ? String(unidadeOuSetor) : null,
      responsavelNome: responsavelNome ? String(responsavelNome) : null,
      responsavelMatricula: responsavelMatricula ? String(responsavelMatricula) : null,
      valorTotal: valorTotal != null ? Number(valorTotal) : null,
      resumo: resumo && typeof resumo === "object" ? resumo : undefined,
    });

    return NextResponse.json({ ok: true, autenticacao }, { headers: corsHeaders });
  } catch (err) {
    console.error("[POST /api/verificar-documento] Erro:", err);
    return NextResponse.json(
      { erro: "Falha ao registrar autenticação de documento." },
      { status: 500, headers: corsHeaders },
    );
  }
}
