"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { systemConfig } from "../../config/system";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  function handleLogin() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* LADO ESQUERDO */}
      <div className="hidden md:flex w-1/2 bg-black text-white flex-col justify-center items-center p-10">

        <img
          src={systemConfig.logo}
          alt="Logo"
          className="w-28 mb-6"
        />

        <h1 className="text-4xl font-bold text-white text-center">
          {systemConfig.name}
        </h1>

        <p className="text-gray-300 mt-4 text-center max-w-md">
          Gestão inteligente para empresas modernas
        </p>
      </div>

      {/* LADO DIREITO */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white p-8">

        <div className="w-full max-w-md border border-gray-300 p-8 rounded-2xl shadow-sm">

          <h2 className="text-2xl font-bold text-black mb-6">
            Acessar sistema
          </h2>

          <label className="text-sm font-medium text-black">
            Email
          </label>

          <input
            type="email"
            placeholder="Digite seu email"
            className="w-full border border-gray-400 p-3 rounded-lg mb-4 text-black focus:outline-none focus:ring-2 focus:ring-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="text-sm font-medium text-black">
            Senha
          </label>

          <input
            type="password"
            placeholder="Digite sua senha"
            className="w-full border border-gray-400 p-3 rounded-lg mb-6 text-black focus:outline-none focus:ring-2 focus:ring-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition font-semibold"
          >
            Entrar
          </button>

          <div className="flex justify-between text-sm text-gray-700 mt-4">
            <a className="hover:underline cursor-pointer">
              Esqueci senha
            </a>

            <a className="text-black font-semibold hover:underline cursor-pointer">
              Criar conta
            </a>
          </div>

        </div>
      </div>

    </div>
  );
}