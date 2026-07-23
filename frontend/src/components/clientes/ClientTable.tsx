"use client";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  CrudColumn,
  CrudTable,
} from "@/components/crud";

interface Client {
  id: number;
  codigo: string;
  razaoSocial: string;
  documento: string;
  cidade: string;
  uf: string;
  status: "Ativo" | "Inativo";
}

const clients: Client[] = [
  {
    id: 1,
    codigo: "CLI000001",
    razaoSocial: "AlePejo Tecnologia",
    documento: "12.345.678/0001-99",
    cidade: "Maringá",
    uf: "PR",
    status: "Ativo",
  },
  {
    id: 2,
    codigo: "CLI000002",
    razaoSocial: "Mercado Central",
    documento: "45.987.654/0001-21",
    cidade: "Cascavel",
    uf: "PR",
    status: "Ativo",
  },
  {
    id: 3,
    codigo: "CLI000003",
    razaoSocial: "Transportadora Brasil",
    documento: "98.456.321/0001-10",
    cidade: "Londrina",
    uf: "PR",
    status: "Inativo",
  },
];

const columns: CrudColumn<Client>[] = [
  {
    id: "codigo",
    header: "Código",
    width: "140px",
    cell: (row) => row.codigo,
  },
  {
    id: "razao",
    header: "Razão Social",
    cell: (row) => row.razaoSocial,
  },
  {
    id: "documento",
    header: "Documento",
    width: "180px",
    cell: (row) => row.documento,
  },
  {
    id: "cidade",
    header: "Cidade",
    cell: (row) => row.cidade,
  },
  {
    id: "uf",
    header: "UF",
    width: "80px",
    align: "center",
    cell: (row) => row.uf,
  },
  {
    id: "status",
    header: "Status",
    width: "120px",
    align: "center",
    cell: (row) => (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          row.status === "Ativo"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {row.status}
      </span>
    ),
  },
  {
    id: "acoes",
    header: "Ações",
    width: "150px",
    align: "center",
    cell: () => (
      <div className="flex justify-center gap-2">
        <button className="rounded-lg p-2 transition hover:bg-[var(--surface-hover)]">
          <Eye size={18} />
        </button>

        <button className="rounded-lg p-2 transition hover:bg-[var(--surface-hover)]">
          <Pencil size={18} />
        </button>

        <button className="rounded-lg p-2 text-red-600 transition hover:bg-red-50">
          <Trash2 size={18} />
        </button>
      </div>
    ),
  },
];

export function ClientTable() {
  return (
    <CrudTable
      columns={columns}
      data={clients}
    />
  );
}