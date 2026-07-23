"use client";

import { createContext, useContext } from "react";

import { Tenant } from "@/types/tenant";

const tenant: Tenant = {
  id: "alepejo",

  language: "pt-BR",

  timezone: "America/Sao_Paulo",

  currency: "BRL",

  company: {
    companyName: "AlePejo",

    systemName: "ERP Cloud",

    logo: "/logo.png",

    favicon: "/favicon.ico",

    logoWidth: 64,

    logoHeight: 64,

    primaryColor: "#000000",

    secondaryColor: "#FFFFFF",
  },
};

const TenantContext = createContext<Tenant>(tenant);

export function TenantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}