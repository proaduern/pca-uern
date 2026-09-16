import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  brl,
  categoriasDoDfd,
  detalhesConvenio,
  detalhesRecursoExtra,
  formatarData,
  numeroFormatado,
  origensDoDfd,
  totalDoDfd,
  tituloDataDfd,
  type DfdParaPdf,
} from "./dfd-dados";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  titulo: { fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 16 },
  secao: { marginTop: 12 },
  secaoTitulo: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  linha: { marginBottom: 2 },
  label: { fontWeight: 700 },
  origemLinha: { flexDirection: "row", marginBottom: 2 },
  nota: { fontSize: 8, fontStyle: "italic", color: "#475569", marginTop: 4 },
  tabela: { marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabelaCelula: { padding: 4, fontSize: 9 },
  colCategoria: { width: "22%" },
  colItem: { width: "34%" },
  colQtd: { width: "10%", textAlign: "right" },
  colValorUnit: { width: "16%", textAlign: "right" },
  colValorTotal: { width: "18%", textAlign: "right" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f1f5f9", fontWeight: 700 },
  rodape: { marginTop: 40, textAlign: "center" },
});

export function DfdDocumento({ dfd }: { dfd: DfdParaPdf }) {
  const origens = origensDoDfd(dfd);
  const convenios = detalhesConvenio(dfd);
  const recursosExtra = detalhesRecursoExtra(dfd);
  const categorias = categoriasDoDfd(dfd);
  const total = totalDoDfd(dfd);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>
          DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA – DFD nº {numeroFormatado(dfd)} – {dfd.unidadeNome.toUpperCase()}
        </Text>

        <View style={s.secao}>
          <Text style={s.linha}>
            <Text style={s.label}>Unidade Demandante: </Text>
            {dfd.unidadeNome}
          </Text>
          <Text style={s.linha}>
            <Text style={s.label}>Responsável pela Demanda: </Text>
            {dfd.responsavelNome ?? "—"}
            {"   "}
            <Text style={s.label}>Matrícula: </Text>
            {dfd.responsavelMatricula ?? "—"}
          </Text>
          <Text style={s.linha}>
            <Text style={s.label}>E-mail: </Text>
            {dfd.unidadeEmail}
            {"   "}
            <Text style={s.label}>Telefone: </Text>
            {dfd.responsavelTelefone ?? "—"}
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. Origem dos Recursos:</Text>
          {origens.map((o) => (
            <View key={o.label} style={s.origemLinha}>
              <Text>({o.marcada ? "X" : "  "}) {o.label}</Text>
            </View>
          ))}

          {convenios.length > 0 && (
            <View style={{ marginTop: 6 }}>
              {convenios.map((c, i) => (
                <View key={i}>
                  <Text style={s.linha}>
                    <Text style={s.label}>Identificação do Convênio: </Text>
                    {c.identificacao}
                  </Text>
                  <Text style={s.linha}>
                    <Text style={s.label}>Valor disponível no Convênio para o objeto demandado: </Text>
                    {c.valorDemandado}
                  </Text>
                  {c.autorEmenda && (
                    <Text style={s.linha}>
                      <Text style={s.label}>Se emenda, autor do convênio: </Text>
                      {c.autorEmenda}
                    </Text>
                  )}
                </View>
              ))}
              <Text style={s.nota}>
                *Caso a opção marcada seja Recursos de Convênio, a unidade requisitante deve juntar à
                solicitação demandada declaração da Diretoria de Convênios e Contratos, certificando a
                existência e disponibilidade de saldo suficiente ao atendimento da demanda.
              </Text>
            </View>
          )}

          {recursosExtra.length > 0 && (
            <View style={{ marginTop: 6 }}>
              {recursosExtra.map((r, i) => (
                <View key={i}>
                  <Text style={s.linha}>
                    <Text style={s.label}>Dados da Conta Bancária: </Text>
                    {r.agenciaConta}
                  </Text>
                  <Text style={s.linha}>
                    <Text style={s.label}>Valor disponível para o objeto demandado: </Text>
                    {r.valorDemandado}
                  </Text>
                </View>
              ))}
              <Text style={s.nota}>
                *Caso a opção marcada seja Recursos da UERN, a unidade requisitante deve anexar à
                solicitação o extrato da conta certificando a existência e disponibilidade financeira
                para atendimento da demanda.
              </Text>
            </View>
          )}
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>2. Tipificação do problema:</Text>
          <Text style={s.linha}>{dfd.tipificacaoNome ?? "—"}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>3. Justificativa da necessidade:</Text>
          <Text style={s.linha}>{dfd.justificativa}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>8. Categoria de itens associados:</Text>
          <Text style={s.linha}>{categorias.join(", ") || "—"}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>9. Lista de itens:</Text>
          <Text style={s.linha}>Planilha emitida em anexo.</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>10. {tituloDataDfd(dfd)}:</Text>
          <Text style={s.linha}>{formatarData(dfd.data)}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>12. Nível Prioridade:</Text>
          <Text style={s.linha}>{dfd.prioridadeFrase}</Text>
        </View>

        <View style={s.rodape}>
          <Text>Assinatura eletrônica do responsável da Unidade Demandante (gerada pelo sistema)</Text>
          <Text>
            {dfd.responsavelNome ?? "—"}
            {dfd.responsavelMatricula ? ` — Matrícula ${dfd.responsavelMatricula}` : ""}
          </Text>
          <Text>{dfd.unidadeNome}</Text>
          <Text>Data da geração do DFD: {formatarData(dfd.criadoEm)}</Text>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>
          Itens do DFD nº {numeroFormatado(dfd)} – {dfd.unidadeNome}
        </Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colCategoria]}>Categoria</Text>
            <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
            <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unitário</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
          </View>
          {dfd.itens.map((it, i) => (
            <View key={i} style={s.tabelaLinha}>
              <Text style={[s.tabelaCelula, s.colCategoria]}>{it.categoriaNome}</Text>
              <Text style={[s.tabelaCelula, s.colItem]}>{it.nome}</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade ?? "—"}</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>{it.valorUnit != null ? brl(it.valorUnit) : "—"}</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotal)}</Text>
            </View>
          ))}
          <View style={s.totalLinha}>
            <Text style={[s.tabelaCelula, s.colCategoria]}></Text>
            <Text style={[s.tabelaCelula, s.colItem]}></Text>
            <Text style={[s.tabelaCelula, s.colQtd]}></Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Total</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
