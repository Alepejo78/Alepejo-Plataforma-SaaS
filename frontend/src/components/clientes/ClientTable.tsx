"use client";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  CrudColumn,
  CrudTable,
} from "@/components/crud";

import { clientService } from "@/services/client.service";

interface Client {
  id: string;
  code: string;
  corporateName: string;
  document: string;
  city?: string;
  state?: string;
  status: string;
}

export function ClientTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadClients() {
    try {
      setLoading(true);

      const data =
        await clientService.findAll();

      setClients(data.items ?? data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const columns: CrudColumn<Client>[] = [
    {
      id: "code",
      header: "Código",
      width: "140px",
      cell: (row) => row.code,
    },
    {
      id: "corporateName",
      header: "Razão Social",
      cell: (row) => row.corporateName,
    },
    {
      id: "document",
      header: "Documento",
      width: "180px",
      cell: (row) => row.document,
    },
    {
      id: "city",
      header: "Cidade",
      cell: (row) => row.city ?? "-",
    },
    {
      id: "state",
      header: "UF",
      width: "80px",
      align: "center",
      cell: (row) => row.state ?? "-",
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      align: "center",
      cell: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            row.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      id: "actions",
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

  return (
    <CrudTable
      columns={columns}
      data={clients}
      loading={loading}
      emptyMessage="Nenhum cliente cadastrado."
    />
  );
}