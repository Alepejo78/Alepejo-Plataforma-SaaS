"use client";

import { useState } from "react";

import { AppShell } from "@/components";
import { CrudPage, CrudToolbar } from "@/components/crud";
import { Modal } from "@/components/ui/Modal";
import { SaleForm } from "@/components/vendas/SaleForm";

export default function VendasPage() {
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);

  return (
    <AppShell>
      <CrudPage
        title="Vendas"
        description="Cadastre e acompanhe as vendas."
        toolbar={
          <CrudToolbar
            search={search}
            onSearch={setSearch}
            onNew={() => setOpenModal(true)}
            onFilter={() => {}}
            onExport={() => {}}
            placeholder="Pesquisar venda..."
            newLabel="Nova Venda"
          />
        }
        table={
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full">
              <thead className="border-b bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Número
                  </th>

                  <th className="px-4 py-3 text-left">
                    Cliente
                  </th>

                  <th className="px-4 py-3 text-left">
                    Data
                  </th>

                  <th className="px-4 py-3 text-right">
                    Valor
                  </th>

                  <th className="px-4 py-3 text-center">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-zinc-500"
                  >
                    Nenhuma venda cadastrada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        }
        modal={
          <Modal
            open={openModal}
            title="Nova Venda"
            size="6xl"
            onClose={() => setOpenModal(false)}
          >
            <SaleForm />
          </Modal>
        }
      />
    </AppShell>
  );
}