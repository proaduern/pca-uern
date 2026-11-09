import { NextRequest, NextResponse } from "next/server";
import { obterKpisLicitacao } from "@/lib/services/kpi-licitacao";
import { obterSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessao = await obterSessao();
    if (!sessao || sessao.tipo !== "ADMIN") {
      return NextResponse.json(
        { erro: "Acesso restrito ao administrador geral do sistema." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const anoParam = searchParams.get("ano");
    const ano = anoParam ? parseInt(anoParam, 10) : undefined;

    const kpis = await obterKpisLicitacao(ano);
    return NextResponse.json(kpis);
  } catch (error: any) {
    console.error("Erro ao calcular KPIs de licitação:", error);
    return NextResponse.json(
      { erro: "Falha ao calcular KPIs de licitação", detalhes: error.message },
      { status: 500 }
    );
  }
}
