import { Suspense } from "react";

import LoginPage from "@/components/auth/LoginPage";

/**
 * O LoginPage usa useSearchParams (para retornar à rota de origem),
 * que exige um boundary de Suspense no App Router.
 */
export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
