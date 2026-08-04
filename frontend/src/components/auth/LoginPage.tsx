"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { systemConfig } from "../../config/system";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      const auth = data.data;

      localStorage.setItem(
        "access_token",
        auth.accessToken,
      );

      localStorage.setItem(
        "user",
        JSON.stringify(auth.user),
      );

      router.replace("/");

      router.refresh();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ??
          "Usuário ou senha inválidos."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">

      <div className="hidden md:flex w-1/2 bg-black text-white flex-col justify-center items-center p-10">

        <img
          src={systemConfig.company.logo}
          alt="Logo"
          className="w-28 mb-6"
        />

        <h1 className="text-4xl font-bold text-center">
          {systemConfig.company.name}
        </h1>

        <p className="text-gray-300 mt-4 text-center max-w-md">
          Gestão inteligente para empresas modernas
        </p>

      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center p-8">

        <div className="w-full max-w-md border border-gray-300 rounded-2xl shadow-sm p-8">

          <h2 className="text-2xl font-bold text-black mb-6">
            Acessar Sistema
          </h2>

          <label className="text-sm font-medium text-black">
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
            className="w-full border border-gray-400 rounded-lg p-3 mb-4 text-black"
          />

          <label className="text-sm font-medium text-black">
            Senha
          </label>

          <input
            id="password"
            name="password"
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            className="w-full border border-gray-400 rounded-lg p-3 text-black"
          />

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleLogin}
            className="mt-6 w-full rounded-lg bg-black p-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-5 flex justify-between text-sm">

            <button
              type="button"
              className="text-gray-700 hover:underline"
            >
              Esqueci minha senha
            </button>

            <button
              type="button"
              className="font-semibold text-black hover:underline"
            >
              Criar conta
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}