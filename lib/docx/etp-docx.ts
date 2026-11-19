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
import type { ItemParaRegramentoMpe } from "@/lib/regramento-mpe";
import { desdobrarItensComRegramentoMpe } from "@/lib/regramento-mpe";

export interface DadosEtpDocx {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string; // Ex: "Estudo Técnico Preliminar nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;

  objeto: string;
  necessidadeContratacao: string;
  referenciaPca: string;
  requisitosContratacao?: string;
  levantamentoMercado?: string;
  descricaoSolucaoCompleta?: string;
  estimativaQuantidades?: string;
  estimativaValor?: string;
  justificativaParcelamento?: string;
  resultadosPretendidos?: string;
  providenciasAdequacao?: string;
  contratacoesCorrelatas?: string;
  posicionamentoConclusivo?: string;

  responsavelNome: string;
  responsavelMatricula?: string | null;
  itens: ItemParaRegramentoMpe[];
  dataTexto?: string;
}

export async function gerarBufferDocxEtp(dados: DadosEtpDocx): Promise<Buffer> {
  const tituloHeader = dados.sequencialTexto || "ESTUDO TÉCNICO PRELIMINAR (LEI Nº 14.133/2021 — AGU)";

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

          criarTituloSecaoDocx("1. DESCRIÇÃO DA NECESSIDADE DA CONTRATAÇÃO"),
          criarParagrafoDocx(
            dados.necessidadeContratacao ||
              "Identificação da necessidade institucional de aquisição ou contratação para manutenção e desenvolvimento das atividades finalísticas e administrativas da Universidade do Estado do Rio Grande do Norte (UERN).",
          ),

          criarTituloSecaoDocx("2. PREVISÃO NO PLANO DE CONTRATAÇÕES ANUAL (PCA)"),
          criarParagrafoDocx(
            dados.referenciaPca ||
              `A presente demanda está formalmente alinhada e contemplada no Plano de Contratações Anual da UERN na categoria '${dados.categoriaNome}'.`,
          ),

          criarTituloSecaoDocx("3. REQUISITOS DA CONTRATAÇÃO"),
          criarParagrafoDocx(
            dados.requisitosContratacao ||
              "Os bens/serviços devem atender aos padrões de qualidade, durabilidade, eficiência energética e sustentabilidade ambiental, conforme critérios vigentes da administração pública.",
          ),

          criarTituloSecaoDocx("4. LEVANTAMENTO DE MERCADO E ANÁLISE DE ALTERNATIVAS"),
          criarParagrafoDocx(
            dados.levantamentoMercado ||
              "Foi realizada prospecção e levantamento técnico de soluções no mercado, identificando-se soluções padronizadas que atendem plenamente aos objetivos com competitividade e economicidade.",
          ),

          criarTituloSecaoDocx("5. DESCRIÇÃO DA SOLUÇÃO COMO UM TODO"),
          criarParagrafoDocx(
            dados.descricaoSolucaoCompleta ||
              dados.objeto ||
              "Compreende o fornecimento dos itens especificados na lista consolidada anexa, englobando transporte, entrega nos locais designados, garantia técnica e suporte operacional.",
          ),

          criarTituloSecaoDocx("6. ESTIMATIVA DAS QUANTIDADES E LISTA CONSOLIDADA DE ITENS"),
          criarParagrafoDocx(
            "A estimativa de quantitativos resulta da consolidação das demandas enviadas pelas diversas unidades acadêmicas e administrativas da UERN nos Documentos de Formalização de Demanda (DFDs), com os devidos ajustes técnicos de viabilidade e padronização:",
          ),
          criarTabelaItensDocx(desdobrarItensComRegramentoMpe(dados.itens)),

          criarTituloSecaoDocx("7. ESTIMATIVA DO VALOR DA CONTRATAÇÃO"),
          criarParagrafoDocx(
            dados.estimativaValor ||
              "O valor estimado da contratação foi obtido com base no valor unitário médio/mediano dos itens cotados, a ser consolidado pela Pesquisa de Preços nos termos da legislação vigente.",
          ),

          criarTituloSecaoDocx("8. JUSTIFICATIVA PARA O PARCELAMENTO OU NÃO DA SOLUÇÃO"),
          criarParagrafoDocx(
            dados.justificativaParcelamento ||
              "A adoção de parcelamento por itens viabiliza a ampliação da concorrência e a participação de microempresas e empresas de pequeno porte nos termos da legislação estadual e federal.",
          ),

          criarTituloSecaoDocx("9. RESULTADOS PRETENDIDOS E BENEFÍCIOS INSTITUCIONAIS"),
          criarParagrafoDocx(
            dados.resultadosPretendidos ||
              "Garantir a continuidade das atividades de ensino, pesquisa, extensão e administração da UERN, assegurando eficiência operacional e economicidade na aplicação dos recursos públicos.",
          ),

          criarTituloSecaoDocx("10. PROVIDÊNCIAS PRÉVIAS AO CONTRATO"),
          criarParagrafoDocx(
            dados.providenciasAdequacao ||
              "Não se identificam reformas ou obras complexas de adequação física para o recebimento dos materiais, competindo às unidades beneficiárias a designação de fiscais e a disponibilização de espaço adequado.",
          ),

          criarTituloSecaoDocx("11. CONTRATAÇÕES CORRELATAS E/OU INTERDEPENDENTES"),
          criarParagrafoDocx(
            dados.contratacoesCorrelatas ||
              "Não há dependência direta com outras contratações em andamento que condicionem a execução deste objeto.",
          ),

          criarTituloSecaoDocx("12. POSICIONAMENTO CONCLUSIVO SOBRE A VIABILIDADE E RAZOABILIDADE"),
          criarParagrafoDocx(
            dados.posicionamentoConclusivo ||
              "Diante do levantamento mercadológico, da estimativa de quantitativos e da demonstração da necessidade pública, conclui-se pela total VIABILIDADE técnica, orçamentária e operacional da presente contratação.",
          ),

          ...criarBlocoAssinaturaDocx(
            dados.responsavelNome,
            "Responsável Técnico pela Elaboração",
            dados.responsavelMatricula,
            dados.dataTexto,
          ),
        ],
      },
    ],
  });

  return empacotarDocxParaBuffer(doc);
}
