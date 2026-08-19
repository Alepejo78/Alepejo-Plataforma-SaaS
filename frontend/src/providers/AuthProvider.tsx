"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { isPublicRoute, isMarketingHomepage } from "@/lib/publicRoutes";
import { rememberCompanySlug } from "@/lib/companyLogin";

import type {
  AuthUser,
  LoginCredentials,
} from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;

  /** true enquanto a sessão inicial ainda está sendo verificada */
  loading: boolean;

  isAuthenticated: boolean;

  /** Preenchido quando a API está inacessível. */
  sessionError: string;

  login: (credentials: LoginCredentials) => Promise<void>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<void>;

  /** Permissão granular (DENY sempre vence ALLOW, igual ao backend) */
  can: (permission: string) => boolean;

  /** Módulo licenciado para a empresa */
  hasModule: (moduleCode: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  /**
   * A sessão vive em cookie httpOnly, que o JS não consegue ler.
   * Por isso a fonte de verdade é o backend: ao montar, perguntamos
   * quem está logado. Se o cookie não existir/expirou, /auth/me
   * devolve 401 e tratamos como visitante.
   */
  const loadSession = useCallback(async () => {
    try {
      const currentUser = await authService.me();

      setUser(currentUser);
      setSessionError("");
      rememberCompanySlug(currentUser.company.slug);
    } catch (err) {
      setUser(null);

      const status = (err as { response?: { status?: number } })
        ?.response?.status;

      if (status === 401 || status === 403) {
        // O cookie existe mas não vale mais (expirado ou revogado).
        // O middleware não consegue detectar isso — ele só verifica
        // se o cookie está presente — então o redirecionamento
        // precisa acontecer aqui.
        // Numa rota pública (definir senha, criar conta) o 401 é o
        // estado NORMAL — quem está ali ainda não tem sessão mesmo.
        // Redirecionar daqui tirava o usuário novo da própria tela de
        // criar senha, deixando-o sem nenhuma forma de entrar.
        if (
          typeof window !== "undefined" &&
          !isPublicRoute(window.location.pathname) &&
          !isMarketingHomepage(
            window.location.pathname,
            window.location.hostname
          )
        ) {
          const { pathname, search } = window.location;

          window.location.href = `/login?from=${encodeURIComponent(
            `${pathname}${search}`
          )}`;

          return;
        }
      } else if (status === undefined) {
        // Sem status = a requisição nem chegou ao servidor
        // (API fora do ar, CORS bloqueado, rede caída).
        setSessionError(
          "Não foi possível conectar ao servidor. Verifique se a API está em execução."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await authService.login(credentials);

      // Após o login, buscamos o perfil completo (permissões e módulos),
      // que o endpoint de login não retorna.
      const currentUser = await authService.me();

      setUser(currentUser);
      rememberCompanySlug(currentUser.company.slug);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);

      router.replace("/login");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const can = useCallback(
    (permission: string) => {
      if (!user) {
        return false;
      }

      const entries = user.permissions.filter(
        (item) => item.code === permission
      );

      if (entries.length === 0) {
        return false;
      }

      return !entries.some((item) => item.effect === "DENY");
    },
    [user]
  );

  const hasModule = useCallback(
    (moduleCode: string) => {
      if (!user) {
        return false;
      }

      const code = moduleCode.toUpperCase();

      return user.modules.some(
        (item) => item.code.toUpperCase() === code
      );
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sessionError,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
      can,
      hasModule,
    }),
    [
      user,
      loading,
      sessionError,
      login,
      logout,
      refreshUser,
      can,
      hasModule,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth deve ser usado dentro de um AuthProvider."
    );
  }

  return context;
}
