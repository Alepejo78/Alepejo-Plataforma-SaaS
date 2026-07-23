"use client";

import { useState } from "react";

import { CrudPage, CrudToolbar } from "@/components/crud";

import { ClientForm } from "@/components/clientes/ClientForm";
import { ClientTable } from "@/components/clientes/ClientTable";

import { Modal } from "@/components/ui/Modal";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);

  return (
    <CrudPage
      title="Clientes"
      description="Gerencie todos os clientes cadastrados."
      toolbar={
        <CrudToolbar
          search={search}
          onSearch={setSearch}
          onNew={() => setOpenModal(true)}
          onFilter={() => {}}
          onExport={() => {}}
          placeholder="Pesquisar cliente..."
          newLabel="Novo Cliente"
        />
      }
      table={<ClientTable />}
      modal={
        <Modal
          open={openModal}
          title="Novo Cliente"
          size="xl"
          onClose={() => setOpenModal(false)}
        >
          <ClientForm />
        </Modal>
      }
    />
  );
}