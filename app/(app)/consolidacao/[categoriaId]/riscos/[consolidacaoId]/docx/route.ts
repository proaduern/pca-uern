import { prisma } from "@/lib/prisma";
import { carregarRiscosParaPdf } from "@/lib/pdf/carregar-riscos";
import { gerarBufferDocxRiscos } from "@/lib/docx/riscos-docx";
import { formatarDataExtenso } from "@/lib/docx/gerador-docx-uern";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoriaId: string; consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarRiscosParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const { riscos } = resultado;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    select: { riscosNumeroFormatado: true },
  });

  const buffer = await gerarBufferDocxRiscos({
    processoSEI: riscos.processoSEI,
    categoriaNome: riscos.categoriaNome,
    sequencialTexto: consolidacao?.riscosNumeroFormatado ?? undefined,
    codigoVerificador: `PCA-RISCOS-${consolidacaoId.slice(0, 8).toUpperCase()}`,
    responsavelNome: riscos.responsavelNome ?? "Responsável Técnico DLC/PROAD",
    responsavelMatricula: riscos.responsavelMatricula,
    riscos: riscos.itens,
    dataTexto: formatarDataExtenso(riscos.finalizadoEm ?? new Date()),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Riscos-${consolidacaoId}.docx"`,
    },
  });
}
