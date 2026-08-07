import { onlyDigits } from "@/lib/masks";

/**
 * Consultas a APIs públicas externas (BrasilAPI e ViaCEP).
 *
 * Usa fetch nativo de propósito, e NÃO o cliente axios da aplicação:
 * aquele envia os cookies de sessão (withCredentials) e aponta para
 * a nossa API. Credenciais nunca devem ir para domínios de terceiros.
 */

export interface CnpjLookupResult {
  legalName: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  status?: string;
}

export interface CepLookupResult {
  street?: string;
  district?: string;
  city?: string;
  state?: string;
}

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      signal: controller.signal,
      // Não enviar cookies para domínios de terceiros.
      credentials: "omit",
    });
  } finally {
    clearTimeout(timer);
  }
}

export const lookupService = {
  /**
   * Consulta dados cadastrais de um CNPJ na BrasilAPI
   * (dados públicos da Receita Federal).
   */
  async cnpj(
    document: string
  ): Promise<CnpjLookupResult> {
    const digits = onlyDigits(document);

    if (digits.length !== 14) {
      throw new Error("CNPJ incompleto.");
    }

    const response = await fetchWithTimeout(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`
    );

    if (response.status === 404) {
      throw new Error("CNPJ não encontrado na Receita Federal.");
    }

    if (!response.ok) {
      throw new Error(
        "Não foi possível consultar o CNPJ agora."
      );
    }

    const data = await response.json();

    const phone =
      data.ddd_telefone_1 || data.ddd_telefone_2 || "";

    return {
      legalName: data.razao_social ?? "",
      tradeName: data.nome_fantasia || undefined,
      email: data.email || undefined,
      phone: phone || undefined,
      zipCode: data.cep ? String(data.cep) : undefined,
      street: [
        data.descricao_tipo_de_logradouro,
        data.logradouro,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || undefined,
      number: data.numero || undefined,
      complement: data.complemento || undefined,
      district: data.bairro || undefined,
      city: data.municipio || undefined,
      state: data.uf || undefined,
      status: data.descricao_situacao_cadastral || undefined,
    };
  },

  /** Consulta endereço por CEP no ViaCEP. */
  async cep(cep: string): Promise<CepLookupResult> {
    const digits = onlyDigits(cep);

    if (digits.length !== 8) {
      throw new Error("CEP incompleto.");
    }

    const response = await fetchWithTimeout(
      `https://viacep.com.br/ws/${digits}/json/`
    );

    if (!response.ok) {
      throw new Error(
        "Não foi possível consultar o CEP agora."
      );
    }

    const data = await response.json();

    if (data.erro) {
      throw new Error("CEP não encontrado.");
    }

    return {
      street: data.logradouro || undefined,
      district: data.bairro || undefined,
      city: data.localidade || undefined,
      state: data.uf || undefined,
    };
  },
};
