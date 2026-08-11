"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Volume2 } from "lucide-react";

import { systemConfig } from "../../config/system";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const videoRef = useRef<HTMLVideoElement>(null);

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Autoplay com som é bloqueado pelo navegador sem interação do
  // usuário — o vídeo começa mudo (autoplay é sempre permitido assim)
  // e ganha som no primeiro clique/toque em qualquer lugar da página.
  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const tryPlay = () => {
      void video.play().catch(() => {});
    };

    tryPlay();

    video.addEventListener("loadeddata", tryPlay);
    video.addEventListener("canplay", tryPlay);

    return () => {
      video.removeEventListener("loadeddata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
    };
  }, []);

  useEffect(() => {
    if (soundEnabled) {
      return;
    }

    const unlockSound = () => {
      const video = videoRef.current;

      if (video) {
        // Recomeça do início para o som tocar por completo, mesmo
        // se o vídeo mudo já tiver chegado ao fim antes do clique.
        video.currentTime = 0;
        video.muted = false;
        void video.play().catch(() => {});
      }

      setSoundEnabled(true);
    };

    document.addEventListener("pointerdown", unlockSound, {
      once: true,
    });

    return () =>
      document.removeEventListener(
        "pointerdown",
        unlockSound
      );
  }, [soundEnabled]);

  /** Clicar no vídeo sempre recomeça a exibição com som — mesmo depois de já ter tocado antes (sem loop, ver <video>). */
  function handleVideoClick() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = 0;
    video.muted = false;
    setSoundEnabled(true);
    void video.play().catch(() => {});
  }

  async function handleLogin() {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Os tokens são gravados pelo backend em cookies httpOnly.
      // Nada de sessão é guardado no localStorage.
      await login({ email, password });

      // Volta para a rota que o usuário tentou acessar antes do login.
      const from = searchParams.get("from");

      router.replace(from && from.startsWith("/") ? from : "/");

      router.refresh();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        "Usuário ou senha inválidos.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">

      <div className="hidden w-1/2 flex-col items-center justify-center bg-[var(--login-panel)] p-10 text-[var(--login-panel-text)] md:flex">

        <div className="relative mb-8">
          <video
            ref={videoRef}
            src={systemConfig.company.loginVideo}
            autoPlay
            muted={!soundEnabled}
            playsInline
            preload="auto"
            onClick={handleVideoClick}
            className="w-56 cursor-pointer"
          />

          {!soundEnabled && (
            <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              <Volume2 size={14} />
              Toque na tela para ativar o som
            </span>
          )}
        </div>

        <h1 className="text-center text-5xl font-bold text-[var(--login-panel-text)]">
          {systemConfig.company.name}
        </h1>

        <span className="mt-4 block h-0.5 w-24 rounded-full bg-[var(--login-panel-accent)]" />

        <p className="mt-4 max-w-md text-center text-lg text-[var(--login-panel-muted)]">
          Gestão inteligente para empresas modernas
        </p>

      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center p-8">

        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Acessar Sistema
          </h2>

          <label className="text-sm font-medium text-[var(--text-primary)]">
            Email
          </label>

          <input
            id="email"
            name="email"
            autoComplete="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu email"
            className="mb-4 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-3 text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
          />

          <label className="text-sm font-medium text-[var(--text-primary)]">
            Senha
          </label>

          <div className="relative">

          <input
            id="password"
            name="password"
            autoComplete="current-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleLogin();
              }
            }}
            placeholder="Digite sua senha"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-3 pr-12 text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword
                ? "Ocultar senha"
                : "Mostrar senha"
            }
            title={
              showPassword
                ? "Ocultar senha"
                : "Mostrar senha"
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>

          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleLogin}
            className="mt-6 w-full rounded-lg bg-[var(--primary)] p-3 font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-5 flex justify-between text-sm">

            <button
              type="button"
              className="text-[var(--text-secondary)] hover:underline"
            >
              Esqueci minha senha
            </button>

            <button
              type="button"
              className="font-semibold text-[var(--text-primary)] hover:underline"
            >
              Criar conta
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
