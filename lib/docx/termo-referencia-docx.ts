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

export interface DadosTrDocx {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string; // Ex: "Termo de Referência nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;
  objeto: string;
  necessidadeContratacao: string;
  descricaoSolucao: string;
  requisitosContratacao: string;
  modeloExecucaoObjeto: string;
  modeloGestaoContrato: string;
  criteriosMedicaoPagamento: string;
  formaSelecaoFornecedor: string;
  exigenciasHabilitacao: string;
  adequacaoOrcamentaria: string;
  garantiaExecucao: string;
  responsavelNome: string;
  responsavelMatricula?: string | null;
  itens: ItemParaRegramentoMpe[];
  dataTexto?: string;
}

export async function gerarBufferDocxTermoReferencia(dados: DadosTrDocx): Promise<Buffer> {
  const itensDesdobrados = desdobrarItensComRegramentoMpe(dados.itens);
  const tituloHeader = dados.sequencialTexto || "TERMO DE REFERÊNCIA (MODELO AGU — LEI Nº 14.133/2021)";

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
          criarParagrafoDocx(`PROCESSO ADMINISTRATIVO SEI Nº ${dados.processoSEI}`, true),
          criarParagrafoDocx(`CATEGORIA DO PLANO DE CONTRATAÇÕES: ${dados.categoriaNome.toUpperCase()}`, true),

          criarTituloSecaoDocx("1. DO OBJETO"),
          criarParagrafoDocx(dados.objeto || dados.categoriaNome),

          criarTituloSecaoDocx("2. DA FUNDAMENTAÇÃO E DA NECESSIDADE DA CONTRATAÇÃO"),
          criarParagrafoDocx(
            dados.necessidadeContratacao ||
              "A contratação fundamenta-se nas conclusões do Estudo Técnico Preliminar (ETP) devidamente aprovado nos autos do processo, demonstrando a necessidade institucional e o interesse público da Universidade do Estado do Rio Grande do Norte (UERN).",
          ),

          criarTituloSecaoDocx("3. DA DESCRIÇÃO DA SOLUÇÃO COMO UM TODO E REQUISITOS DA CONTRATAÇÃO"),
          criarParagrafoDocx(
            dados.descricaoSolucao ||
              dados.requisitosContratacao ||
              "Conforme especificações e requisitos definidos nos Estudos Técnicos Preliminares e no Mapa de Riscos da contratação.",
          ),

          criarTituloSecaoDocx("4. DA ESPECIFICAÇÃO DOS ITENS E DO TRATAMENTO DIFERENCIADO ÀS ME/EPP (LEI ESTADUAL Nº 675/2020)"),
          criarParagrafoDocx(
            "Em conformidade com a Lei Complementar Estadual nº 675, de 06 de novembro de 2020 (Estatuto da ME/EPP do Rio Grande do Norte) e a Lei Complementar Federal nº 123/2006, os itens com valor estimado até R$ 200.000,00 (duzentos mil reais) destinam-se exclusivamente à participação de microempresas e empresas de pequeno porte (Art. 42 da LC 675/2020-RN). Para os itens divisíveis de valor superior a R$ 200.000,00, é estabelecida cota reservada de até 25% para ME/EPP e cota principal de 75% destinada à ampla concorrência (Art. 44 da LC 675/2020-RN).",
          ),
          criarTabelaItensDocx(itensDesdobrados),

          criarTituloSecaoDocx("5. DO MODELO DE EXECUÇÃO DO OBJETO, PRAZOS E CONDIÇÕES DE ENTREGA"),
          criarParagrafoDocx(
            dados.modeloExecucaoObjeto ||
              "O objeto deverá ser fornecido/executado estritamente de acordo com as ordens de fornecimento/serviço, atendendo aos prazos e locais fixados na sede da UERN ou em seus Campi Avançados.",
          ),

          criarTituloSecaoDocx("6. DO MODELO DE GESTÃO DO CONTRATO E CRITÉRIOS DE MEDIÇÃO E PAGAMENTO"),
          criarParagrafoDocx(
            dados.modeloGestaoContrato ||
              "A gestão e a fiscalização da contratação serão exercidas por representantes da UERN especificamente designados por Portaria da PROAD.",
          ),
          criarParagrafoDocx(
            dados.criteriosMedicaoPagamento ||
              "A medição dos serviços/recebimento dos bens observará a verificação de conformidade qualitativa e quantitativa, com aplicação das faixas do Instrumento de Medição de Resultado (IMR), quando couber, para liquidação e pagamento.",
          ),

          criarTituloSecaoDocx("7. DA FORMA DE SELEÇÃO DO FORNECEDOR E CRITÉRIOS DE JULGAMENTO"),
          criarParagrafoDocx(
            dados.formaSelecaoFornecedor ||
              "A seleção do fornecedor dar-se-á por meio de licitação eletrônica (Pregão Eletrônico ou Concorrência, sob o regime da Lei nº 14.133/2021), adotando-se o critério de julgamento de menor preço ou maior desconto por item/lote.",
          ),

          criarTituloSecaoDocx("8. DAS EXIGÊNCIAS DE HABILITAÇÃO"),
          criarParagrafoDocx(
            dados.exigenciasHabilitacao ||
              "Os licitantes deverão comprovar habilitação jurídica, regularidade fiscal, social e trabalhista, qualificação técnica e qualificação econômico-financeira, assegurando-se às ME/EPP os benefícios dos arts. 40 e 41 da LC Estadual nº 675/2020-RN e arts. 42 a 45 da LC Federal nº 123/2006.",
          ),

          criarTituloSecaoDocx("9. DA ADEQUAÇÃO ORÇAMENTÁRIA"),
          criarParagrafoDocx(
            dados.adequacaoOrcamentaria ||
              "As despesas decorrentes da presente contratação correrão à conta de dotação orçamentária própria consignada no orçamento da Universidade do Estado do Rio Grande do Norte (UERN / FUERN).",
          ),

          criarTituloSecaoDocx("10. DA GARANTIA DE EXECUÇÃO E SANÇÕES ADMINISTRATIVAS"),
          criarParagrafoDocx(
            dados.garantiaExecucao ||
              "Aplicam-se as sanções administrativas previstas nos arts. 155 a 163 da Lei nº 14.133/2021, garantidos o contraditório e a ampla defesa.",
          ),

          ...criarBlocoAssinaturaDocx(
            dados.responsavelNome || "Servidor do Setor de Planejamento",
            "Responsável pela Elaboração do Termo de Referência",
            dados.responsavelMatricula,
            dados.dataTexto,
          ),
        ],
      },
    ],
  });

  return empacotarDocxParaBuffer(doc);
}
