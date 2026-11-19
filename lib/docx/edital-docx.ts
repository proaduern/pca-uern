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

export interface DadosEditalDocx {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string; // Ex: "Edital nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;
  objeto: string;
  tipoContratacao?: "NORMAL" | "ATA";
  formaSelecaoFornecedor?: string;
  criteriosMedicaoPagamento?: string;
  exigenciasHabilitacao?: string;
  garantiaExecucao?: string;
  condicoesParticipacao?: string;
  credenciamento?: string;
  apresentacaoProposta?: string;
  julgamentoPropostas?: string;
  documentosHabilitacao?: string;
  recursosAdministrativos?: string;
  sancoesAdministrativas?: string;
  disposicoesGerais?: string;
  responsavelNome: string;
  responsavelMatricula?: string | null;
  itens: ItemParaRegramentoMpe[];
  dataTexto?: string;
}

export async function gerarBufferDocxEdital(dados: DadosEditalDocx): Promise<Buffer> {
  const itensDesdobrados = desdobrarItensComRegramentoMpe(dados.itens);
  const tituloHeader = dados.sequencialTexto || "EDITAL DE LICITAÇÃO — LEI Nº 14.133/2021";

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
            `UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN\nDIRETORIA DE LICITAÇÕES E CONTRATOS (DLC / PROAD)\nUASG 925543 — PROCESSO ADMINISTRATIVO SEI Nº ${dados.processoSEI}`,
            true,
          ),
          criarParagrafoDocx(
            `A Fundação Universidade do Estado do Rio Grande do Norte (FUERN), por intermédio de seu Agente de Contratação e Equipe de Apoio, designados nos autos, torna público que realizará licitação, na modalidade PREGÃO, sob a forma ELETRÔNICA, com critério de julgamento de MENOR PREÇO / MAIOR DESCONTO, sob o regime da Lei nº 14.133/2021, da Lei Complementar Estadual nº 675/2020-RN e da Lei Complementar Federal nº 123/2006.`,
          ),

          criarTituloSecaoDocx("1. DO OBJETO"),
          criarParagrafoDocx(dados.objeto || dados.categoriaNome),
          criarTabelaItensDocx(itensDesdobrados),

          criarTituloSecaoDocx("2. DAS CONDIÇÕES DE PARTICIPAÇÃO E TRATAMENTO FAVORECIDO ÀS ME/EPP"),
          criarParagrafoDocx(
            dados.condicoesParticipacao ||
              "Poderão participar deste certame os interessados que atenderem a todas as exigências deste Edital. Nos termos da Lei Complementar Estadual nº 675/2020-RN e da LC Federal nº 123/2006, é assegurado tratamento favorecido e diferenciado às Microempresas e Empresas de Pequeno Porte, com exclusividade para itens de até R$ 200.000,00 e cota reservada de até 25% para itens divisíveis acima de R$ 200.000,00.",
          ),

          criarTituloSecaoDocx("3. DO CREDENCIAMENTO NO SISTEMA ELETRÔNICO"),
          criarParagrafoDocx(
            dados.credenciamento ||
              "O credenciamento dar-se-á pela atribuição de chave de identificação e de senha pessoal e intransferível para acesso ao sistema eletrônico no portal oficial Compras.gov.br.",
          ),

          criarTituloSecaoDocx("4. DA APRESENTAÇÃO DA PROPOSTA E DOS DOCUMENTOS DE HABILITAÇÃO"),
          criarParagrafoDocx(
            dados.apresentacaoProposta ||
              "Os licitantes encaminharão, exclusivamente por meio do sistema eletrônico, a proposta com a descrição do objeto ofertado e o preço, até a data e o horário estabelecidos para abertura da sessão pública.",
          ),

          criarTituloSecaoDocx("5. DO JULGAMENTO DAS PROPOSTAS DE PREÇO E MODO DE DISPUTA"),
          criarParagrafoDocx(
            dados.julgamentoPropostas ||
              "O julgamento das propostas será realizado pelo critério de menor preço ou maior desconto, observadas as regras de desempate preferencial para ME/EPP previstas no art. 41 da LC Estadual nº 675/2020-RN e art. 44 da LC Federal nº 123/2006.",
          ),

          criarTituloSecaoDocx("6. DA HABILITAÇÃO"),
          criarParagrafoDocx(
            dados.documentosHabilitacao ||
              "A habilitação jurídica, fiscal, social e trabalhista, técnica e econômico-financeira será comprovada pelos documentos exigidos no Termo de Referência e no Edital.",
          ),

          criarTituloSecaoDocx("7. DOS RECURSOS ADMINISTRATIVOS"),
          criarParagrafoDocx(
            dados.recursosAdministrativos ||
              "Declarado o vencedor, qualquer licitante poderá manifestar imediata e motivadamente a intenção de recorrer, com prazo de 3 (três) dias úteis para apresentação das razões recursais, conforme art. 165 da Lei nº 14.133/2021.",
          ),

          criarTituloSecaoDocx("8. DAS SANÇÕES ADMINISTRATIVAS"),
          criarParagrafoDocx(
            dados.sancoesAdministrativas ||
              "Comete infração administrativa o licitante que incorrer em quaisquer dos atos tipificados no art. 155 da Lei nº 14.133/2021, sujeitando-se às penalidades de advertência, multa, impedimento de licitar e declaração de inidoneidade.",
          ),

          criarTituloSecaoDocx("9. DAS DISPOSIÇÕES GERAIS E ANEXOS"),
          criarParagrafoDocx(
            dados.disposicoesGerais ||
              "Integram este Edital, para todos os efeitos de direito: Anexo I — Termo de Referência; Anexo II — Minuta do Instrumento Contratual / Ata de Registro de Preços; Anexo III — Estudo Técnico Preliminar (ETP); Anexo IV — Mapa de Riscos; Anexo V — Instrumento de Medição de Resultado (IMR), quando couber. Foro da Comarca de Mossoró/RN.",
          ),

          ...criarBlocoAssinaturaDocx(
            dados.responsavelNome || "Agente de Contratação",
            "Agente de Contratação — DLC / PROAD / UERN",
            dados.responsavelMatricula,
            dados.dataTexto,
          ),
        ],
      },
    ],
  });

  return empacotarDocxParaBuffer(doc);
}
