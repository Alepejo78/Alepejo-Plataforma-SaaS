"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import LoginPage from "@/components/auth/LoginPage";
import { companyOnboardingService } from "@/services/company-onboarding.service";
import { rememberCompanySlug } from "@/lib/companyLogin";

/**
 * ÚNICA porta de entrada com formulário de verdade — o link que o
 * e-mail de "definir senha"/"esqueci minha senha" manda como acesso
 * permanente (ver `sendPasswordResetLink` no backend). `/login`
 * (genérico, `app/login/page.tsx`) não tem mais formulário próprio,
 * só decide pra onde mandar.
 *
 * Confirmado o slug, o navegador "lembra" essa empresa
 * (`rememberCompanySlug`) — é o que permite `/login` genérico
 * redirecionar sozinho da próxima vez (sessão expirando no meio da
 * navegação, por exemplo), sem precisar pedir o link nem a empresa de
 * novo.
 */
function CompanyLoginForm() {
  const params = useParams<{ empresa: string }>();
  const [companyName, setCompanyName] = useState<string | undefined>();

  useEffect(() => {
    if (!params.empresa) {
      return;
    }

    companyOnboardingService
      .getBySlug(params.empresa)
      .then((company) => {
        setCompanyName(company.tradeName || company.legalName);
        rememberCompanySlug(params.empresa);
      })
      .catch(() => {
        // Slug não encontrado: segue como login genérico, sem nome em cima.
      });
  }, [params.empresa]);

  return <LoginPage companyName={companyName} />;
}

export default function CompanyLoginPage() {
  return (
    <Suspense fallback={null}>
      <CompanyLoginForm />
    </Suspense>
  );
}
