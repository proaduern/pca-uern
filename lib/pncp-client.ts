/**
 * Cliente Oficial de Integração com a API REST do PNCP (Portal Nacional de Contratações Públicas)
 * Lei Federal nº 14.133/2021 — Padrão MGI / Serpro
 *
 * Para ativação pela STI/UERN, basta configurar no arquivo .env:
 * - PNCP_API_URL="https://treina.pncp.gov.br/api/pncp/v1" (Homologação) ou "https://pncp.gov.br/api/pncp/v1" (Produção)
 * - PNCP_LOGIN="<login_sistema_integrador_uern>"
 * - PNCP_SENHA="<senha_sistema_integrador_uern>"
 * - UERN_CNPJ="08241739000105"
 * - UERN_CODIGO_UNIDADE="925543"
 */

export interface StatusConfiguracaoPncp {
  configurado: boolean;
  ambiente: "PRODUCAO" | "TREINAMENTO" | "NAO_CONFIGURADO";
  mensagem: string;
}

export function verificarConfiguracaoPncp(): StatusConfiguracaoPncp {
  const login = process.env.PNCP_LOGIN?.trim();
  const senha = process.env.PNCP_SENHA?.trim();
  const apiUrl = process.env.PNCP_API_URL?.trim() || "";

  if (!login || !senha) {
    return {
      configurado: false,
      ambiente: "NAO_CONFIGURADO",
      mensagem:
        "A integração automática com o PNCP ainda não está configurada. É necessário configurar as credenciais de Sistema Integrador (PNCP_LOGIN, PNCP_SENHA e código da Unidade Compradora) junto à STI/UERN e ao Portal do PNCP. Enquanto isso, utilize normalmente o registro manual no sistema.",
    };
  }

  const isProducao = apiUrl.includes("//pncp.gov.br");
  return {
    configurado: true,
    ambiente: isProducao ? "PRODUCAO" : "TREINAMENTO",
    mensagem: `Integração PNCP pronta (${isProducao ? "Produção Oficial" : "Ambiente de Homologação/Treinamento"}).`,
  };
}

async function autenticarPncp(): Promise<{ token: string; apiUrl: string; cnpjOrgao: string; codigoUnidade: string }> {
  const status = verificarConfiguracaoPncp();
  if (!status.configurado) {
    throw new Error(status.mensagem);
  }

  const apiUrl = (process.env.PNCP_API_URL || "https://treina.pncp.gov.br/api/pncp/v1").replace(/\/$/, "");
  const cnpjOrgao = (process.env.UERN_CNPJ || "08241739000105").replace(/\D/g, "");
  const codigoUnidade = process.env.UERN_CODIGO_UNIDADE || "925543";

  const res = await fetch(`${apiUrl}/usuarios/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: process.env.PNCP_LOGIN,
      senha: process.env.PNCP_SENHA,
    }),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Falha ao autenticar na API do PNCP (HTTP ${res.status}): ${detalhe}`);
  }

  const authHeader = res.headers.get("authorization") || res.headers.get("Authorization");
  const body = await res.json().catch(() => ({}));
  const token = authHeader?.replace(/^Bearer\s+/i, "") || body.token || body.accessToken;

  if (!token) {
    throw new Error("Token JWT não retornado pela API do PNCP.");
  }

  return { token, apiUrl, cnpjOrgao, codigoUnidade };
}

export interface ItemPcaPncpPayload {
  numeroItem: number;
  categoriaItemPca: number; // 1 = Material, 2 = Serviço, 3 = Obra, 4 = TIC
  descricao: string;
  unidadeFornecimento: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorOrcamentoExercicio: number;
  dataDesejada: string; // YYYY-MM-DD
  unidadeRequisitante: string;
}

/**
 * Envia o Plano de Contratações Anual (PCA) diretamente para o PNCP via API REST
 * Endpoint oficial: POST /v1/orgaos/{cnpj}/pca
 */
export async function publicarPcaNoPncpApi(anoPca: number, itens: ItemPcaPncpPayload[]): Promise<{
  sequencialPcaPncp: string;
  urlPublicaPncp: string;
}> {
  const { token, apiUrl, cnpjOrgao, codigoUnidade } = await autenticarPncp();

  const payload = {
    anoPca,
    codigoUnidade,
    itensPlano: itens,
  };

  const res = await fetch(`${apiUrl}/orgaos/${cnpjOrgao}/pca`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const erroTxt = await res.text().catch(() => "");
    throw new Error(`Erro ao publicar PCA no PNCP (HTTP ${res.status}): ${erroTxt}`);
  }

  const location = res.headers.get("location") || "";
  const data = await res.json().catch(() => ({}));
  const sequencial = data.sequencialPca || location.split("/").pop() || `PNCP-PCA-${anoPca}`;

  return {
    sequencialPcaPncp: `PNCP-${anoPca}-${sequencial}`,
    urlPublicaPncp: location || `https://pncp.gov.br/app/pca/${cnpjOrgao}/${anoPca}`,
  };
}

/**
 * Publica o Edital / Contratação diretamente no PNCP via API REST
 * Endpoint oficial: POST /v1/orgaos/{cnpj}/compras
 */
export async function publicarEditalNoPncpApi(dados: {
  anoCompra: number;
  processoSei: string;
  objetoCompra: string;
  modalidadeId: number; // Ex.: 6 = Pregão Eletrônico
  modoDisputaId: number; // Ex.: 1 = Aberto
  srp: boolean;
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  itensCompra: Array<{
    numeroItem: number;
    materialOuServico: "M" | "S";
    descricao: string;
    unidadeMedida: string;
    quantidade: number;
    valorUnitarioEstimado: number;
    valorTotal: number;
  }>;
}): Promise<{ codigoControlePncp: string; urlPublicaPncp: string }> {
  const { token, apiUrl, cnpjOrgao, codigoUnidade } = await autenticarPncp();

  const payload = {
    codigoUnidadeCompradora: codigoUnidade,
    tipoInstrumentoConvocatorioId: 1, // Edital
    modalidadeId: dados.modalidadeId,
    modoDisputaId: dados.modoDisputaId,
    numeroCompra: dados.processoSei.replace(/\D/g, "").slice(-5) || "00001",
    anoCompra: dados.anoCompra,
    numeroProcesso: dados.processoSei,
    objetoCompra: dados.objetoCompra,
    informacaoComplementar: "Publicado via integração direta PROAD/UERN",
    srp: dados.srp,
    dataAberturaProposta: dados.dataAberturaProposta,
    dataEncerramentoProposta: dados.dataEncerramentoProposta,
    amparoLegalId: 1, // Lei 14.133/2021, Art. 28, I
    itensCompra: dados.itensCompra,
  };

  const res = await fetch(`${apiUrl}/orgaos/${cnpjOrgao}/compras`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const erroTxt = await res.text().catch(() => "");
    throw new Error(`Erro ao publicar Edital no PNCP (HTTP ${res.status}): ${erroTxt}`);
  }

  const location = res.headers.get("location") || "";
  const data = await res.json().catch(() => ({}));
  const codigo = data.numeroControlePNCP || location.split("/").pop() || `PNCP-EDITAL-${dados.anoCompra}`;

  return {
    codigoControlePncp: String(codigo),
    urlPublicaPncp: location || `https://pncp.gov.br/app/editais/${cnpjOrgao}/${dados.anoCompra}`,
  };
}
