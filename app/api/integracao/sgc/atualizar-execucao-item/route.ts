import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const serviceKey = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";

    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: "Chave de integração PROAD inválida ou ausente." }, { status: 401 });
    }

    const body = await request.json();
    const {
      contratoId,
      numeroContrato,
      ataId,
      numeroAta,
      fornecedorNome,
      fornecedorCnpj,
      origemPcaConsolidacaoId,
      itensOrigemPcaIds = [],
      statusExecucao,
      dataRecebimentoProv,
      dataRecebimentoDef,
      dataAtesto,
      numeroNotaFiscal,
    } = body;

    let targetItemIds: string[] = [];

    if (Array.isArray(itensOrigemPcaIds) && itensOrigemPcaIds.length > 0) {
      const validos = await prisma.itemDfd.findMany({
        where: { id: { in: itensOrigemPcaIds.filter(Boolean) } },
        select: { id: true },
      });
      targetItemIds = validos.map((i) => i.id);
    }

    if (targetItemIds.length === 0 && origemPcaConsolidacaoId) {
      const vinculados = await prisma.itemDfd.findMany({
        where: { consolidacaoTecnicaId: origemPcaConsolidacaoId },
        select: { id: true },
      });
      targetItemIds = vinculados.map((i) => i.id);
    }

    if (targetItemIds.length === 0 && contratoId) {
      const vinculados = await prisma.itemDfd.findMany({
        where: { sgcContratoId: contratoId },
        select: { id: true },
      });
      targetItemIds = vinculados.map((i) => i.id);
    }

    if (targetItemIds.length === 0) {
      return NextResponse.json({
        sucesso: false,
        mensagem: "Nenhum item do PCA localizado para os parâmetros fornecidos.",
      }, { status: 404 });
    }

    const updatePayload: any = {};
    if (contratoId) updatePayload.sgcContratoId = contratoId;
    if (numeroContrato) updatePayload.sgcNumeroContrato = numeroContrato;
    if (ataId) updatePayload.sgcAtaId = ataId;
    if (numeroAta) updatePayload.sgcNumeroAta = numeroAta;
    if (fornecedorNome) updatePayload.sgcFornecedorNome = fornecedorNome;
    if (fornecedorCnpj) updatePayload.sgcFornecedorCnpj = fornecedorCnpj;
    if (statusExecucao) updatePayload.sgcStatusExecucao = statusExecucao;
    if (dataRecebimentoProv) updatePayload.sgcDataRecebimentoProv = new Date(dataRecebimentoProv);
    if (dataRecebimentoDef) updatePayload.sgcDataRecebimentoDef = new Date(dataRecebimentoDef);
    if (dataAtesto) updatePayload.sgcDataAtesto = new Date(dataAtesto);
    if (numeroNotaFiscal) updatePayload.sgcNumeroNotaFiscal = numeroNotaFiscal;

    const resUpdate = await prisma.itemDfd.updateMany({
      where: { id: { in: targetItemIds } },
      data: updatePayload,
    });

    return NextResponse.json({
      sucesso: true,
      itensAtualizados: resUpdate.count,
      statusExecucao,
      mensagem: `${resUpdate.count} item(ns) do DFD atualizado(s) no PCA com status de execução do SGC.`,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar execução de item no PCA via SGC:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar atualização de execução.", detalhes: error.message },
      { status: 500 }
    );
  }
}
