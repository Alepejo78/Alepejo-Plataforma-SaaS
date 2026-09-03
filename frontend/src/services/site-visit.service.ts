import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export const siteVisitService = {
  /** Pública (sem sessão) — soma uma visita e devolve o total atualizado. */
  async increment(page: string): Promise<number> {
    const { data } = await api.post<ApiEnvelope<{ count: number }>>(
      `/site-visits/${encodeURIComponent(page)}/increment`
    );

    return data.data.count;
  },
};
