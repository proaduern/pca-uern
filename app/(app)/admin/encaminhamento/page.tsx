import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import TabelaEncaminhamento, {
  DfdEncaminhamentoItem,
  SetorTecnicoOption,
} from "./TabelaEncaminhamento";
import { ArrowRightLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Encaminhamento aos Setores Técnicos | PCA UERN",
};

export default async function AdminEncaminhamentoPage() {
  await exigirAdminNaPagina();

  const [dfdsAprovados, setoresTecnicos] = await Promise.all([
    prisma.dfd.findMany({
      where: {
        status: "APROVADO",
      },
      include: {
        unidade: { select: { id: true, nome: true } },
        setorTecnicoDestino: { select: { id: true, nome: true } },
        itens: {
          select: {
            id: true,
            valorTotal: true,
            consolidacaoTecnicaId: true,
            categoria: {
              select: {
                id: true,
                nome: true,
                fluxoContinuo: true,
                setorTecnicoId: true,
                setorTecnico: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
      orderBy: [{ ano: "desc" }, { numero: "asc" }],
    }),
    prisma.setorTecnico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const dfdsFormatados: DfdEncaminhamentoItem[] = dfdsAprovados.map((d) => {
    const primeiroItem = d.itens[0];
    const cat = primeiroItem?.categoria;
    const setorPadrao = cat?.setorTecnico;
    const totalValor = d.itens.reduce((sum, it) => sum + Number(it.valorTotal || 0), 0);
    const consolidado = d.itens.some((it) => it.consolidacaoTecnicaId !== null);

    const categoriasUnicas = [
      ...new Set(d.itens.map((it) => it.categoria?.nome).filter(Boolean)),
    ];
    const contagemPorSetor = new Map<string, number>();
    for (const it of d.itens) {
      const c = it.categoria;
      const nomeSetor =
        c?.setorTecnico?.nome ||
        (c?.fluxoContinuo ? "SDHP / PROAD (Fluxo Contínuo)" : "Não definido");
      contagemPorSetor.set(nomeSetor, (contagemPorSetor.get(nomeSetor) ?? 0) + 1);
    }
    const setoresDetalhados = [...contagemPorSetor.entries()];
    const setorTecnicoPadraoNome =
      setoresDetalhados.length === 0
        ? "Não definido"
        : setoresDetalhados.length === 1
          ? setoresDetalhados[0][0]
          : setoresDetalhados.map(([nome, qtd]) => `${nome} (${qtd})`).join(" + ");

    return {
      id: d.id,
      ano: d.ano,
      numero: d.numero,
      descricaoSumaria: d.descricaoSumaria || "Demanda sem descrição",
      unidadeNome: d.unidade?.nome || "Unidade não identificada",
      categoriaNome: categoriasUnicas.length > 0 ? categoriasUnicas.join(" + ") : "Sem categoria",
      categoriaId: cat?.id || "",
      setorTecnicoPadraoId: setorPadrao?.id || null,
      setorTecnicoPadraoNome,
      setorTecnicoDestinoId: d.setorTecnicoDestinoId,
      setorTecnicoDestinoNome: d.setorTecnicoDestino?.nome || null,
      statusEncaminhamento: d.statusEncaminhamento,
      encaminhadoSetorEm: d.encaminhadoSetorEm,
      totalItens: d.itens.length,
      totalValor,
      processoSeiOrigem: d.processoSeiOrigem,
      idSeiDfdOrigem: d.idSeiDfdOrigem,
      consolidado,
    };
  });

  const dfdsPendentes = dfdsFormatados.filter(
    (d) => d.statusEncaminhamento === "PENDENTE_DISTRIBUICAO",
  );
  const dfdsEncaminhados = dfdsFormatados.filter(
    (d) => d.statusEncaminhamento === "ENCAMINHADO_SETOR_TECNICO",
  );

  const setoresOptions: SetorTecnicoOption[] = setoresTecnicos.map((s) => ({
    id: s.id,
    nome: s.nome,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Encaminhamento de Demandas aos Setores Técnicos
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#003366]">
              Etapa Intermediária PROAD
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Após aprovação no PCA, a PROAD confirma o envio de cada demanda para o Setor Técnico padrão da categoria ou altera o destino para comissões e setores específicos antes da consolidação e ETP.
          </p>
        </div>
        <Link
          href="/admin/setores-tecnicos"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#003366] shadow-xs hover:bg-slate-50 transition shrink-0"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Gerenciar Setores Técnicos</span>
        </Link>
      </div>

      <TabelaEncaminhamento
        dfdsPendentes={dfdsPendentes}
        dfdsEncaminhados={dfdsEncaminhados}
        setoresTecnicos={setoresOptions}
      />
    </div>
  );
}
