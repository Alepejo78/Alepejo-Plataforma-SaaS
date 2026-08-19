import axios, {
  AxiosError,
  AxiosRequestConfig,
} from "axios";

import { env } from "@/lib/env";
import { isPublicRoute, isMarketingHomepage } from "@/lib/publicRoutes";

/**
 * Cliente HTTP da aplicação.
 *
 * `withCredentials: true` é obrigatório: os tokens ficam em cookies
 * httpOnly, e sem essa flag o navegador não os envia para a API
 * (origem diferente: :3000 -> :3001). Não existe Authorization header
 * aqui — o JavaScript propositalmente não tem acesso ao token.
 */
export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

type FailedRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
};

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

/**
 * Quando o access token expira, várias chamadas podem falhar ao mesmo
 * tempo. Sem essa fila, cada uma dispararia seu próprio /auth/refresh —
 * e como o backend faz rotação de refresh token (reuso invalida a
 * sessão), a segunda chamada derrubaria a sessão inteira.
 * Por isso: só um refresh por vez; as demais aguardam o resultado.
 */
const processQueue = (error: unknown, success: boolean) => {
  failedQueue.forEach((pending) => {
    if (success) {
      pending.resolve(api(pending.config));
    } else {
      pending.reject(error);
    }
  });

  failedQueue = [];
};

const redirectToLogin = () => {
  if (typeof window === "undefined") {
    return;
  }

  const { pathname, search } = window.location;

  // Rotas públicas (definir senha, criar conta) não têm sessão por
  // definição — o 401 ali é esperado, não é sessão perdida. Sem esta
  // guarda, o usuário novo era expulso da própria tela de criar senha.
  if (
    isPublicRoute(pathname) ||
    isMarketingHomepage(pathname, window.location.hostname)
  ) {
    return;
  }

  const from = encodeURIComponent(`${pathname}${search}`);

  window.location.href = `/login?from=${from}`;
};

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const status = error.response?.status;

    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url ?? "";

    // Falha no próprio login/refresh não deve gerar novo refresh.
    if (
      url.includes("/auth/login") ||
      url.includes("/auth/refresh")
    ) {
      if (url.includes("/auth/refresh")) {
        redirectToLogin();
      }

      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      redirectToLogin();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          config: originalRequest,
        });
      });
    }

    isRefreshing = true;

    try {
      await api.post("/auth/refresh");

      processQueue(null, true);

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, false);

      redirectToLogin();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
