"use client";

import { useCallback, useState } from "react";

import { AppShell } from "@/components";
import { CrudPage, CrudToolbar } from "@/components/crud";
import { ClientForm } from "@/components/clientes/ClientForm";
import { ClientTable } from "@/components/clientes/ClientTable";
import { Modal } from "@/components/ui/Modal";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setReloadKey((old) => old + 1);
  }, []);

  return (
    <AppShell>
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
        table={
          <ClientTable
            key={reloadKey}
          />
        }
        modal={
          <Modal
            open={openModal}
            title="Novo Cliente"
            size="xl"
            onClose={handleCloseModal}
          >
            <ClientForm />
          </Modal>
        }
      />
    </AppShell>
  );
}