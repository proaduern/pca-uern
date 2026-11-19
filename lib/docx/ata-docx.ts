import { Document } from "docx";
import {
  criarCabecalhoDocxUern,
  criarRodapeDocxUern,
  criarTituloSecaoDocx,
  criarParagrafoDocx,
  criarBlocoAssinaturaDocx,
  criarTabelaItensDocx,
  empacotarDocxParaBuffer,
} from "./gerador-docx-uern";
import {
  desdobrarItensComRegramentoMpe,
  type ItemParaRegramentoMpe,
} from "@/lib/regramento-mpe";

export interface DadosAtaDocx {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string; // Ex: "Ata de Registro de Preços nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;
  objeto: string;
  detentoraRazaoSocial?: string | null;
  detentoraCnpj?: string | null;
  clausulaValidadeAta?: string;
  clausulaOrgaoGerenciadorParticipantes?: string;
  clausulaAdesaoCarona?: string;
  clausulaRevisaoCancelamentoPrecos?: string;
  clausulaCadastroReserva?: string;
  clausulaCondicoesFornecimento?: string;
  clausulaPenalidadesAta?: string;
  clausulaDisposicoesFinais?: string;
  responsavelNome: string;
  responsavelMatricula?: string | null;
  itens: ItemParaRegramentoMpe[];
  dataTexto?: string;
}

export async function gerarBufferDocxAta(dados: DadosAtaDocx): Promise<Buffer> {
  const itensDesdobrados = desdobrarItensComRegramentoMpe(dados.itens);
  const tituloHeader = dados.sequencialTexto || "ATA DE REGISTRO DE PREÇOS — LEI Nº 14.133/2021";

  const detentoraInfo = dados.detentoraRazaoSocial
    ? `${dados.detentoraRazaoSocial}, CNPJ: ${dados.detentoraCnpj || "—"}`
    : "DETENTORA DA ATA (a ser qualificada na formalização definitiva)";

  const doc = new Document({
    sections: [
      {
        headers: {
          default: criarCabecalhoDocxUern(tituloHeader),
        },
        footers: {
          default: criarRodapeDocxUern(tituloHeader, dados.codigoVerificador),
        },
        children: [
          criarParagrafoDocx(
            `ATA DE REGISTRO DE PREÇOS QUE ENTRE SI CELEBRAM A FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (FUERN / ÓRGÃO GERENCIADOR) E ${detentoraInfo.toUpperCase()}, REFERENTE AO PROCESSO SEI Nº ${dados.processoSEI}.`,
            true,
          ),
          criarParagrafoDocx(
            `A FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — FUERN, Órgão Gerenciador, inscrita no CNPJ/MF sob o nº 08.258.295/0001-02, com sede na Rua Almino Afonso, 478, Centro, Mossoró/RN, CEP 59610-210, e a empresa ${detentoraInfo}, resolvem firmar a presente Ata de Registro de Preços, com amparo na Lei nº 14.133/2021, na Lei Complementar Estadual nº 675/2020-RN e no Edital convocatório, observadas as cláusulas seguintes:`,
          ),

          criarTituloSecaoDocx("CLÁUSULA PRIMEIRA — DO OBJETO E PREÇOS REGISTRADOS"),
          criarParagrafoDocx(
            dados.objeto || `Registro de preços referente à categoria ${dados.categoriaNome}.`,
          ),
          criarTabelaItensDocx(itensDesdobrados),

          criarTituloSecaoDocx("CLÁUSULA SEGUNDA — DA VALIDADE DA ATA DE REGISTRO DE PREÇOS"),
          criarParagrafoDocx(
            dados.clausulaValidadeAta ||
              "O prazo de vigência desta Ata de Registro de Preços será de 1 (um) ano, contado a partir de sua publicação oficial, podendo ser prorrogado por igual período, desde que comprovada a vantajosidade dos preços registrados (Art. 84 da Lei nº 14.133/2021).",
          ),

          criarTituloSecaoDocx("CLÁUSULA TERCEIRA — DO ÓRGÃO GERENCIADOR E ÓRGÃOS PARTICIPANTES"),
          criarParagrafoDocx(
            dados.clausulaOrgaoGerenciadorParticipantes ||
              "O Órgão Gerenciador desta Ata é a Universidade do Estado do Rio Grande do Norte (UERN / PROAD), competindo-lhe praticar todos os atos de controle e administração do Sistema de Registro de Preços.",
          ),

          criarTituloSecaoDocx("CLÁUSULA QUARTA — DA UTILIZAÇÃO DA ATA POR ÓRGÃOS NÃO PARTICIPANTES (CARONA)"),
          criarParagrafoDocx(
            dados.clausulaAdesaoCarona ||
              "A utilização da ata por órgãos não participantes observará estritamente os limites do art. 86 da Lei nº 14.133/2021: até 50% dos quantitativos por órgão solicitante e no máximo 200% no somatório de todas as adesões, condicionada à prévia anuência do Órgão Gerenciador e concordância do fornecedor.",
          ),

          criarTituloSecaoDocx("CLÁUSULA QUINTA — DA REVISÃO E CANCELAMENTO DOS PREÇOS REGISTRADOS"),
          criarParagrafoDocx(
            dados.clausulaRevisaoCancelamentoPrecos ||
              "Os preços registrados poderão ser revistos em decorrência de eventual redução dos preços praticados no mercado ou de fato superveniente que eleve os custos da prestação, cabendo ao órgão gerenciador promover as negociações devidas.",
          ),

          criarTituloSecaoDocx("CLÁUSULA SEXTA — DO CADASTRO DE RESERVA"),
          criarParagrafoDocx(
            dados.clausulaCadastroReserva ||
              "Será incluído na ata, sob a forma de anexo, o registro dos licitantes que aceitarem cotar os bens ou serviços com preços iguais aos do adjudicatário, para eventual convocação na ordem de classificação caso a detentora tenha seu registro cancelado.",
          ),

          criarTituloSecaoDocx("CLÁUSULA SÉTIMA — DAS CONDIÇÕES DE FORNECIMENTO"),
          criarParagrafoDocx(
            dados.clausulaCondicoesFornecimento ||
              "As contratações decorrentes desta Ata serão formalizadas por instrumento contratual, emissão de nota de empenho ou autorização de compra emitida pelo SGC/UERN, respeitados os prazos e condições do Termo de Referência.",
          ),

          criarTituloSecaoDocx("CLÁUSULA OITAVA — DAS PENALIDADES E DISPOSIÇÕES FINAIS"),
          criarParagrafoDocx(
            dados.clausulaPenalidadesAta ||
              dados.clausulaDisposicoesFinais ||
              "O descumprimento injustificado das condições estabelecidas nesta Ata sujeitará o fornecedor às sanções administrativas previstas na Lei nº 14.133/2021 e no Edital. Foro da Comarca de Mossoró/RN.",
          ),

          ...criarBlocoAssinaturaDocx(
            "FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (FUERN)",
            "Órgão Gerenciador",
            null,
            dados.dataTexto,
          ),
          ...criarBlocoAssinaturaDocx(
            dados.detentoraRazaoSocial || "DETENTORA DA ATA",
            "Representante Legal",
            null,
            dados.dataTexto,
          ),
        ],
      },
    ],
  });

  return empacotarDocxParaBuffer(doc);
}
