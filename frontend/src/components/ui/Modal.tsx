"use client";

import { useState } from "react";

import {
  Button,
  Surface,
  Typography,
} from "@/components";

import { ClientTable } from "@/components/clientes/ClientTable";
import { DataTableToolbar } from "@/components/ui/DataTableToolbar";

export default function ClientesPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <div>

          <Typography variant="h1">
            Clientes
          </Typography>

          <Typography
            variant="body"
            className="text-[var(--text-muted)]"
          >
            Gerencie todos os clientes cadastrados.
          </Typography>

        </div>

      </div>

      <Surface className="rounded-2xl border border-[var(--border)] p-6">

        <DataTableToolbar
          search={search}
          onSearch={setSearch}
          newLabel="Novo Cliente"
          onNew={() => {}}
          onFilter={() => {}}
          onExport={() => {}}
          placeholder="Pesquisar cliente por código, nome ou documento..."
        />

      </Surface>

      <ClientTable />

    </div>
  );
}