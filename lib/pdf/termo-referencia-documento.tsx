import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarDataHora } from "../formato";
import { SECOES_TR } from "../termo-referencia";
import { totalItensTr, type TermoReferenciaParaPdf } from "./termo-referencia-dados";
import type { DadosAutenticacaoPdf } from "./autenticacao";
import { RodapeAutenticacaoPdf } from "./rodape-autenticacao";
import { CabecalhoInstitucionalPdf } from "./cabecalho-institucional-pdf";
import { desdobrarItensComRegramentoMpe } from "../regramento-mpe";

const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  secao: { marginTop: 10 },
  secaoTitulo: { fontSize: 9.5, fontWeight: "bold", marginBottom: 3, color: "#1e3a8a" },
  corpo: { fontSize: 8.5, lineHeight: 1.35, textAlign: "justify" },
  rodape: { marginTop: 24, textAlign: "center" },
  nota: { fontSize: 7.5, fontStyle: "italic", color: "#64748b", marginTop: 4 },
  tabela: { marginTop: 6, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabelaCelula: { padding: 3.5, fontSize: 8 },
  colItem: { width: "42%" },
  colEnquadramento: { width: "22%", fontSize: 7.5 },
  colQtd: { width: "10%", textAlign: "right" },
  colValorUnit: { width: "13%", textAlign: "right" },
  colValorTotal: { width: "13%", textAlign: "right" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f8fafc", fontWeight: "bold" },
  textoDestaque: { fontSize: 8, fontStyle: "italic", color: "#1e3a8a", marginBottom: 4 },
});

export function TermoReferenciaDocumento({
  tr,
  autenticacao,
}: {
  tr: TermoReferenciaParaPdf;
  autenticacao?: DadosAutenticacaoPdf;
}) {
  // Converte itens para regramento MPE da LC 675/2020-RN
  const itensDesdobrados = desdobrarItensComRegramentoMpe(
    tr.itens.map((it, idx) => ({
      numeroItem: idx + 1,
      descricao: it.nome,
      quantidade: it.quantidade ?? 1,
      valorUnitarioEstimado: it.valorUnit ?? (it.quantidade ? it.valorTotal / it.quantidade : it.valorTotal),
      valorTotalEstimado: it.valorTotal,
      divisivel: it.divisivel ?? true,
    })),
  );

  const totalCalculado = itensDesdobrados.reduce((acc, it) => acc + it.valorTotalEstimado, 0);

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CabecalhoInstitucionalPdf
          tituloDocumento="TERMO DE REFERÊNCIA"
          processoSEI={tr.processoSEI}
          categoriaNome={tr.categoriaNome}
          numeroSequencial={tr.sequencialTexto}
        />

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. DO OBJETO</Text>
          <Text style={s.corpo}>{tr.objeto}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>2. DA FUNDAMENTAÇÃO DA CONTRATAÇÃO E ALINHAMENTO AO PCA</Text>
          <Text style={s.corpo}>{tr.necessidadeContratacao}</Text>
          <Text style={s.corpo}>{tr.referenciaPca}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>3. DA DESCRIÇÃO DA SOLUÇÃO COMO UM TODO</Text>
          <Text style={s.corpo}>{tr.descricaoSolucaoCompleta}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>
            4. DA ESPECIFICAÇÃO DOS ITENS E ENQUADRAMENTO DA LEI ESTADUAL Nº 675/2020
          </Text>
          <Text style={s.textoDestaque}>
            Aplicação do Art. 42 da Lei Complementar Estadual nº 675/2020 (exclusividade ME/EPP até R$ 200.000,00)
            e Art. 44 (cota reservada de até 25% para bens divisíveis acima de R$ 200.000,00).
          </Text>

          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.tabelaCelula, s.colItem]}>Item / Especificação</Text>
              <Text style={[s.tabelaCelula, s.colEnquadramento]}>Enquadramento LC 675</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor Unit.</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor Total</Text>
            </View>
            {itensDesdobrados.map((it, i) => (
              <View key={i} style={s.tabelaLinha}>
                <Text style={[s.tabelaCelula, s.colItem]}>{it.descricao}</Text>
                <Text style={[s.tabelaCelula, s.colEnquadramento]}>{it.enquadramentoTexto}</Text>
                <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade}</Text>
                <Text style={[s.tabelaCelula, s.colValorUnit]}>{brl(it.valorUnitarioEstimado)}</Text>
                <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotalEstimado)}</Text>
              </View>
            ))}
            <View style={s.totalLinha}>
              <Text style={[s.tabelaCelula, s.colItem]}>TOTAL GERAL ESTIMADO</Text>
              <Text style={[s.tabelaCelula, s.colEnquadramento]}></Text>
              <Text style={[s.tabelaCelula, s.colQtd]}></Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}></Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(totalCalculado)}</Text>
            </View>
          </View>
        </View>

        {SECOES_TR.map((secao) => (
          <View key={secao.campo} style={s.secao} wrap>
            <Text style={s.secaoTitulo}>
              {secao.numero}. {secao.titulo.toUpperCase()}
            </Text>
            <Text style={s.corpo}>{(tr as unknown as Record<string, string>)[secao.campo] || "—"}</Text>
          </View>
        ))}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>23. RESPONSABILIDADE PELA ELABORAÇÃO DO TERMO DE REFERÊNCIA</Text>
          <Text style={s.corpo}>
            Certifico que sou responsável pela elaboração do presente documento e que o mesmo traz os
            conteúdos e especificações em conformidade com as diretrizes e modelos oficiais da Universidade e da AGU.
          </Text>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo Sistema de Planejamento de Contratações (PCA-UERN)</Text>
          <Text>
            {tr.responsavelNome ?? "—"}
            {tr.responsavelMatricula ? ` — Matrícula ${tr.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {tr.status === "FINALIZADO" && tr.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(tr.finalizadoEm)}`
              : "RASCUNHO — em elaboração"}
          </Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
