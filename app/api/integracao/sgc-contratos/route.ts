import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessao = await obterSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const anoParam = searchParams.get("ano");
    const ano = anoParam ? parseInt(anoParam, 10) : new Date().getFullYear();

    const sgcBaseUrl = process.env.SGC_API_URL || "http://localhost:3000";
    const serviceKey = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";

    // 1. Consulta contratos contínuos na API do SGC
    let sgcData: any = { contratos: [] };
    try {
      const resSgc = await fetch(`${sgcBaseUrl}/api/integracao/contratos-continuos?anoPca=${ano}`, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
      });

      if (resSgc.ok) {
        sgcData = await resSgc.json();
      } else {
        console.warn("SGC retornou status:", resSgc.status);
      }
    } catch (err: any) {
      console.error("Não foi possível conectar à API do SGC:", err.message);
    }

    const contratosSgc: any[] = sgcData.todosContratosContinuados || sgcData.contratos || [];

    // 2. Busca DFDs existentes no PCA para o ano de referência
    const dfdsExistentes = await prisma.dfd.findMany({
      where: { ano },
      select: {
        id: true,
        numero: true,
        descricaoSumaria: true,
        justificativa: true,
        status: true,
        unidade: { select: { id: true, nome: true } },
      },
    });

    // 3. Cruza os contratos com os DFDs já criados no PCA
    const contratosComStatus = contratosSgc.map((c) => {
      // Verifica se o número do contrato ou processo SEI já consta na descrição ou justificativa de algum DFD
      const dfdVinculado = dfdsExistentes.find((d) => {
        const textoDfd = `${d.descricaoSumaria} ${d.justificativa}`.toLowerCase();
        const numContratoLimpo = (c.numeroContrato || "").toLowerCase().replace(/contrato\s*/i, "").trim();
        const processoSeiLimpo = (c.processoSeiMae || "").toLowerCase().trim();

        return (
          (numContratoLimpo && textoDfd.includes(numContratoLimpo)) ||
          (processoSeiLimpo && textoDfd.includes(processoSeiLimpo))
        );
      });

      return {
        ...c,
        jaIncorporadoPca: Boolean(dfdVinculado),
        dfdExistente: dfdVinculado
          ? {
              id: dfdVinculado.id,
              numero: dfdVinculado.numero,
              status: dfdVinculado.status,
              unidadeNome: dfdVinculado.unidade?.nome,
            }
          : null,
      };
    });

    return NextResponse.json({
      anoReferencia: ano,
      totalContratos: contratosComStatus.length,
      totalIncorporados: contratosComStatus.filter((c) => c.jaIncorporadoPca).length,
      totalPendentes: contratosComStatus.filter((c) => !c.jaIncorporadoPca).length,
      contratos: contratosComStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao consultar contratos do SGC." }, { status: 500 });
  }
}
