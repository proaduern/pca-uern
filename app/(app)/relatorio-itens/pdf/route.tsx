import { renderToBuffer } from "@react-pdf/renderer";
import { carregarRelatorioItens } from "@/lib/pdf/carregar-relatorio-itens";
import { RelatorioItensDocumento } from "@/lib/pdf/relatorio-itens-documento";
import { totalDosItens } from "@/lib/relatorio-unidade";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET() {
  const resultado = await carregarRelatorioItens();
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "RELATORIO_ITENS",
    referenciaId: resultado.unidadeNome,
    titulo: `Relatório Geral de Itens — ${resultado.unidadeNome}`,
    unidadeOuSetor: resultado.unidadeNome,
    valorTotal: totalDosItens(resultado.itens),
    resumo: {
      Unidade: resultado.unidadeNome,
      "Total de Itens": resultado.itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <RelatorioItensDocumento
      unidadeNome={resultado.unidadeNome}
      itens={resultado.itens}
      autenticacao={autenticacao}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Relatorio-Geral-Itens.pdf"`,
    },
  });
}
