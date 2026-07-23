"use client";

import { useState } from "react";

import { Button, Surface, Typography } from "@/components";
import { FormField } from "@/components/ui/FormField";
import { ClientTabs } from "./ClientTabs";

export function ClientForm() {
  const [activeTab, setActiveTab] = useState("geral");

  return (
    <Surface className="rounded-2xl border border-[var(--border)] p-8">

      <div className="mb-8">

        <Typography variant="h2">
          Cadastro de Cliente
        </Typography>

        <Typography
          variant="body"
          className="text-[var(--text-muted)]"
        >
          Cadastro completo de clientes.
        </Typography>

      </div>

      <ClientTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="mt-8">

        {activeTab === "geral" && (

          <div className="grid gap-6 xl:grid-cols-3">

            <div>

              <label className="mb-2 block text-sm font-medium">
                Tipo Pessoa
              </label>

              <select className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4">

                <option>Pessoa Jurídica</option>

                <option>Pessoa Física</option>

              </select>

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium">
                Situação
              </label>

              <select className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4">

                <option>Ativo</option>

                <option>Inativo</option>

              </select>

            </div>

            <FormField
              label="Código"
              value="CLI000001"
              disabled
            />

            <div className="xl:col-span-3">

              <FormField
                label="Razão Social"
                placeholder="Informe a razão social"
                required
              />

            </div>

            <FormField
              label="Nome Fantasia"
              placeholder="Nome fantasia"
            />

            <FormField
              label="CPF / CNPJ"
              placeholder="00.000.000/0000-00"
              required
            />

            <FormField
              label="Inscrição Estadual"
            />

            <FormField
              label="Inscrição Municipal"
            />

            <FormField
              label="E-mail"
              type="email"
            />

            <FormField
              label="Telefone"
            />

            <FormField
              label="Celular"
            />

            <FormField
              label="Site"
            />

          </div>

        )}

        {activeTab !== "geral" && (

          <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-[var(--border)]">

            <Typography
              variant="body"
              className="text-[var(--text-muted)]"
            >
              Aba "{activeTab}" em desenvolvimento.
            </Typography>

          </div>

        )}

      </div>

      <div className="mt-10 flex justify-end gap-3">

        <Button variant="outline">
          Cancelar
        </Button>

        <Button>
          Salvar Cliente
        </Button>

      </div>

    </Surface>
  );
}