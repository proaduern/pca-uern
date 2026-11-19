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

export interface DadosContratoDocx {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string; // Ex: "Contrato nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;
  objeto: string;
  contratadaRazaoSocial?: string | null;
  contratadaCnpj?: string | null;
  contratadaEndereco?: string | null;
  contratadaRepresentante?: string | null;
  clausulaVigenciaProrrogacao?: string;
  clausulaDotacaoOrcamentaria?: string;
  clausulaReajusteRepactuacao?: string;
  clausulaGarantiaContratual?: string;
  clausulaObrigacoesContratada?: string;
  clausulaObrigacoesContratante?: string;
  clausulaFiscalizacaoGestao?: string;
  clausulaExtincaoForo?: string;
  responsavelNome: string;
  responsavelMatricula?: string | null;
  itens: ItemParaRegramentoMpe[];
  dataTexto?: string;
}

export async function gerarBufferDocxContrato(dados: DadosContratoDocx): Promise<Buffer> {
  const itensDesdobrados = desdobrarItensComRegramentoMpe(dados.itens);
  const tituloHeader = dados.sequencialTexto || "TERMO DE CONTRATO ADMINISTRATIVO — LEI Nº 14.133/2021";

  const contratadaInfo = dados.contratadaRazaoSocial
    ? `${dados.contratadaRazaoSocial}, inscrita no CNPJ sob o nº ${dados.contratadaCnpj || "—"}, com sede em ${dados.contratadaEndereco || "—"}, representada por ${dados.contratadaRepresentante || "seu representante legal"}`
    : "A EMPRESA VENCEDORA DO CERTAME (a ser qualificada na formalização definitiva)";

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
            `TERMO DE CONTRATO QUE ENTRE SI CELEBRAM A FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (FUERN) E ${contratadaInfo.toUpperCase()}, PARA O FORNECIMENTO/EXECUÇÃO DO OBJETO REFERENTE AO PROCESSO SEI Nº ${dados.processoSEI}.`,
            true,
          ),
          criarParagrafoDocx(
            `A FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — FUERN, entidade fundacional de direito público criada pela Lei Estadual nº 3.480/1968, mantenedora da Universidade do Estado do Rio Grande do Norte (UERN), inscrita no CNPJ/MF sob o nº 08.258.295/0001-02, com sede na Rua Almino Afonso, 478, Centro, Mossoró/RN, CEP 59610-210, neste ato representada pela Reitora ou Pró-Reitor de Administração, e de outro lado ${contratadaInfo}, doravante denominada simplesmente CONTRATADA, resolvem celebrar o presente Termo de Contrato, sob a égide da Lei nº 14.133/2021, mediante as cláusulas e condições seguintes:`,
          ),

          criarTituloSecaoDocx("CLÁUSULA PRIMEIRA — DO OBJETO E VALORES"),
          criarParagrafoDocx(
            dados.objeto || `Contratação referente à categoria ${dados.categoriaNome}.`,
          ),
          criarTabelaItensDocx(itensDesdobrados),

          criarTituloSecaoDocx("CLÁUSULA SEGUNDA — DA VIGÊNCIA E PRORROGAÇÃO"),
          criarParagrafoDocx(
            dados.clausulaVigenciaProrrogacao ||
              "O prazo de vigência deste Contrato é de 12 (doze) meses, contados da data de sua assinatura, prorrogável nos termos dos arts. 105 a 107 da Lei nº 14.133/2021.",
          ),

          criarTituloSecaoDocx("CLÁUSULA TERCEIRA — DA DOTAÇÃO ORÇAMENTÁRIA"),
          criarParagrafoDocx(
            dados.clausulaDotacaoOrcamentaria ||
              "As despesas decorrentes da presente contratação correrão à conta dos recursos orçamentários consignados no orçamento da UERN / FUERN.",
          ),

          criarTituloSecaoDocx("CLÁUSULA QUARTA — DO REAJUSTE E REPACTUAÇÃO DE PREÇOS"),
          criarParagrafoDocx(
            dados.clausulaReajusteRepactuacao ||
              "Os preços contratados são fixos e irreajustáveis no interregno de 1 (um) ano. Após decorrido o prazo, aplicar-se-á o Índice Nacional de Preços ao Consumidor Amplo (IPCA/IBGE) ou repactuação por variação de custos decorrente de convenção coletiva, se for o caso.",
          ),

          criarTituloSecaoDocx("CLÁUSULA QUINTA — DA GARANTIA CONTRATUAL"),
          criarParagrafoDocx(
            dados.clausulaGarantiaContratual ||
              "Será exigida prestação de garantia contratual na forma e percentual previstos no Edital e no Termo de Referência, com amparo no art. 96 da Lei nº 14.133/2021.",
          ),

          criarTituloSecaoDocx("CLÁUSULA SEXTA — DAS OBRIGAÇÕES DA CONTRATADA"),
          criarParagrafoDocx(
            dados.clausulaObrigacoesContratada ||
              "A Contratada obriga-se a fornecer os bens ou prestar os serviços em estrita conformidade com o Termo de Referência, mantendo durante toda a execução as condições de regularidade jurídica, fiscal e trabalhista.",
          ),

          criarTituloSecaoDocx("CLÁUSULA SÉTIMA — DAS OBRIGAÇÕES DA CONTRATANTE"),
          criarParagrafoDocx(
            dados.clausulaObrigacoesContratante ||
              "A Contratante obriga-se a proporcionar todas as condições necessárias para que a Contratada execute o contrato, acompanhar e fiscalizar a execução e efetuar os pagamentos devidos nos prazos legais.",
          ),

          criarTituloSecaoDocx("CLÁUSULA OITAVA — DA GESTÃO E FISCALIZAÇÃO DO CONTRATO"),
          criarParagrafoDocx(
            dados.clausulaFiscalizacaoGestao ||
              "A gestão e fiscalização da execução contratual serão exercidas por servidores designados por Portaria específica da PROAD, competindo-lhes atestar a conformidade das entregas.",
          ),

          criarTituloSecaoDocx("CLÁUSULA NONA — DA EXTINÇÃO CONTRATUAL E FORO"),
          criarParagrafoDocx(
            dados.clausulaExtincaoForo ||
              "O presente contrato poderá ser extinto nas hipóteses previstas nos arts. 137 a 139 da Lei nº 14.133/2021. As partes elegem o Foro da Comarca de Mossoró/RN para dirimir quaisquer dúvidas ou litígios oriundos deste Contrato.",
          ),

          ...criarBlocoAssinaturaDocx(
            "FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE (FUERN)",
            "Contratante",
            null,
            dados.dataTexto,
          ),
          ...criarBlocoAssinaturaDocx(
            dados.contratadaRazaoSocial || "CONTRATADA",
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
