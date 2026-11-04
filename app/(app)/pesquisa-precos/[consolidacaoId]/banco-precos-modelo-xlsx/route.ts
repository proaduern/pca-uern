import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { gerarXlsxModeloBancoPrecos } from "@/lib/pesquisa-precos-banco";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  if (
    sessao.tipo !== "PESQUISA_PRECOS" &&
    sessao.tipo !== "ADMIN" &&
    sessao.tipo !== "LICITACOES" &&
    sessao.tipo !== "AGENTE_CONTRATACAO"
  ) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const { consolidacaoId } = await params;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
      itensDfd: true,
      itensTecnicos: true,
    },
  });

  if (!consolidacao) {
    return NextResponse.json({ erro: "Consolidação não encontrada." }, { status: 404 });
  }

  // Se já existir PesquisaDePrecos criada, usa a ordem exata dos itens dela;
  // caso contrário, consolida os itens da ConsolidacaoTecnica por nome.
  let itensExportacao: { nome: string; descricao: string; quantidade: number }[] = [];

  if (consolidacao.pesquisaDePrecos && consolidacao.pesquisaDePrecos.itens.length > 0) {
    itensExportacao = consolidacao.pesquisaDePrecos.itens.map((it) => ({
      nome: it.item,
      descricao: it.item,
      quantidade: Number(it.quantidade),
    }));
  } else {
    const mapa = new Map<string, number>();
    for (const it of consolidacao.itensDfd) {
      const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)").trim();
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(it.quantidade ?? 1));
    }
    for (const it of consolidacao.itensTecnicos) {
      const nome = it.item.trim();
      mapa.set(nome, (mapa.get(nome) ?? 0) + Number(it.quantidade ?? 1));
    }
    itensExportacao = [...mapa.entries()].map(([nome, quantidade]) => ({
      nome,
      descricao: nome,
      quantidade,
    }));
  }

  const buffer = await gerarXlsxModeloBancoPrecos(itensExportacao);
  const seiLimpo = consolidacao.processoSEI.replace(/[^0-9A-Za-z._-]/g, "_");
  const filename = `Modelo_Banco_de_Precos_${seiLimpo}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
