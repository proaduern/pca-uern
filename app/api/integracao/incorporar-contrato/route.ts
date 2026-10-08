import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessao = await obterSessao();
    if (!sessao) {
      return NextResponse.json({ error: "Sessão expirada ou não autenticada." }, { status: 401 });
    }

    const body = await request.json();
    const { contratoId, anoPca, unidadeId, contratoData } = body;

    if (!contratoId || !anoPca) {
      return NextResponse.json({ error: "Identificador do contrato e Ano do PCA são obrigatórios." }, { status: 400 });
    }

    const ano = parseInt(anoPca, 10);

    // 1. Garante que o PCA do ano exista no banco
    let pcaDb = await prisma.pca.findUnique({ where: { ano } });
    if (!pcaDb) {
      pcaDb = await prisma.pca.create({
        data: {
          ano,
          ativo: true,
          dataAbertura: new Date(ano - 1, 0, 1),
          dataFechamento: new Date(ano, 11, 31),
        },
      });
    }

    // 2. Garante a Unidade responsável no PCA (padrão PROAD ou a especificada)
    let unidadeAlvoId = unidadeId || sessao.unidadeId;
    if (!unidadeAlvoId) {
      let proadUnidade = await prisma.unidade.findFirst({
        where: { OR: [{ nome: "PROAD" }, { email: "proad@uern.br" }] },
      });
      if (!proadUnidade) {
        proadUnidade = await prisma.unidade.create({
          data: {
            nome: "PROAD",
            email: "proad@uern.br",
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativa: true,
          },
        });
      }
      unidadeAlvoId = proadUnidade.id;
    }

    // 3. Obtém Prioridade padrão
    let prioridade = await prisma.prioridade.findFirst();
    if (!prioridade) {
      prioridade = await prisma.prioridade.create({
        data: { frase: "Alta", nivel: "ALTA" },
      });
    }

    // 4. Obtém ou cria Categoria para Serviços Contínuos
    let categoria = await prisma.categoria.findFirst({
      where: { nome: { contains: "Serviço", mode: "insensitive" } },
    });
    if (!categoria) {
      categoria = await prisma.categoria.create({
        data: {
          nome: "Serviços Terceirizados e Contínuos",
          tipo: "SERVICO",
          modoServico: "OBJETO",
          fluxoContinuo: true,
          dependeContrato: true,
        },
      });
    }

    // 5. Dados do contrato (vindos do SGC)
    const numeroContrato = contratoData?.numeroContrato || "Contrato SGC";
    const processoSei = contratoData?.processoSeiMae || "SEI UERN";
    const objeto = contratoData?.objeto || "Serviço Contínuo";
    const fornecedorNome = contratoData?.fornecedor?.razaoSocial || "Fornecedor Contratado";
    const fornecedorCnpj = contratoData?.fornecedor?.cnpj || "";
    const valorAnual = contratoData?.valorAnualizadoEstimado || contratoData?.valorAtualizado || 0;
    const vigenciaFim = contratoData?.vigenciaFim ? new Date(contratoData.vigenciaFim) : new Date(ano, 11, 31);
    const tipoDemanda = contratoData?.tipoDemandaSugerida === "NOVA" ? "NOVA" : "RENOVACAO";

    // 6. Transação atômica: gera número sequencial e cria DFD + Item
    const novoDfd = await prisma.$transaction(async (tx) => {
      const ultimoDfd = await tx.dfd.findFirst({
        where: { unidadeId: unidadeAlvoId, ano },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });

      const proximoNumero = (ultimoDfd?.numero ?? 0) + 1;

      const dfd = await tx.dfd.create({
        data: {
          unidadeId: unidadeAlvoId,
          ano,
          numero: proximoNumero,
          descricaoSumaria: `${tipoDemanda === "RENOVACAO" ? "Renovação Contratual" : "Nova Contratação"} - ${objeto}`,
          justificativa: `Continuidade dos serviços essenciais pactuados no ${numeroContrato} (Processo SEI ${processoSei}). Contratada: ${fornecedorNome}${fornecedorCnpj ? ` (CNPJ ${fornecedorCnpj})` : ""}. Vencimento atual: ${vigenciaFim.toLocaleDateString("pt-BR")}.`,
          tipoDemanda,
          dataRenovacao: tipoDemanda === "RENOVACAO" ? vigenciaFim : null,
          dataEntrega: tipoDemanda === "NOVA" ? vigenciaFim : null,
          prioridadeId: prioridade.id,
          status: "RASCUNHO",
          criadoPorId: sessao.id,
          criadoPorUsuarioId: sessao.usuarioId || null,
        },
      });

      // Cria Item de DFD correspondente com o valor previsto
      await tx.itemDfd.create({
        data: {
          dfdId: dfd.id,
          tipo: "SERVICO",
          enquadramento: "GERAL",
          categoriaId: categoria.id,
          itemNomeLivre: `Execução Contratual (${numeroContrato}) - ${objeto}`,
          quantidade: 1,
          valorUnit: valorAnual,
          valorTotal: valorAnual,
          correlacao: `Integração automática SGC ➔ PCA (Contrato ID: ${contratoId}, SEI: ${processoSei})`,
        },
      });

      return dfd;
    });

    return NextResponse.json({
      success: true,
      message: `DFD nº ${novoDfd.numero}/${ano} gerado com sucesso para a demanda de continuidade!`,
      dfdId: novoDfd.id,
      numero: novoDfd.numero,
      ano: novoDfd.ano,
    });
  } catch (err: any) {
    console.error("Erro ao incorporar contrato ao PCA:", err);
    return NextResponse.json({ error: err.message || "Erro ao gerar DFD de renovação." }, { status: 500 });
  }
}
