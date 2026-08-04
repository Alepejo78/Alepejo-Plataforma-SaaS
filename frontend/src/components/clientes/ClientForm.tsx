"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  Surface,
  Typography,
} from "@/components";

import { FormField } from "@/components/ui/FormField";
import { ClientTabs } from "./ClientTabs";

import {
  clientService,
  CreateClientDto,
} from "@/services/client.service";

export function ClientForm() {
  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState("geral");

  const [loading, setLoading] =
    useState(false);

  const [personType, setPersonType] =
    useState("JURIDICA");

  const [status, setStatus] =
    useState("ACTIVE");

  const [corporateName, setCorporateName] =
    useState("");

  const [tradeName, setTradeName] =
    useState("");

  const [document, setDocument] =
    useState("");

  const [
    stateRegistration,
    setStateRegistration,
  ] = useState("");

  const [
    municipalRegistration,
    setMunicipalRegistration,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [mobilePhone, setMobilePhone] =
    useState("");

  const [website, setWebsite] =
    useState("");

  async function handleSubmit() {
    try {
      setLoading(true);

      const dto: CreateClientDto = {
        personType,
        status,
        corporateName,
        tradeName,
        document,
        stateRegistration,
        municipalRegistration,
        email,
        phone,
        mobilePhone,
        website,
      };

      await clientService.create(dto);

      alert(
        "Cliente cadastrado com sucesso."
      );

      setPersonType("JURIDICA");
      setStatus("ACTIVE");
      setCorporateName("");
      setTradeName("");
      setDocument("");
      setStateRegistration("");
      setMunicipalRegistration("");
      setEmail("");
      setPhone("");
      setMobilePhone("");
      setWebsite("");

      router.refresh();
    } catch (error: any) {
      console.error(error);

      alert(
        error?.response?.data?.message ??
          "Erro ao salvar cliente."
      );
    } finally {
      setLoading(false);
    }
  }

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

<select
  value={personType}
  onChange={(e) =>
    setPersonType(e.target.value)
  }
  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"
>
  <option value="JURIDICA">
    Pessoa Jurídica
  </option>

  <option value="FISICA">
    Pessoa Física
  </option>

</select>

</div>

<div>

<label className="mb-2 block text-sm font-medium">
  Situação
</label>

<select
  value={status}
  onChange={(e) =>
    setStatus(e.target.value)
  }
  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"
>
  <option value="ACTIVE">
    Ativo
  </option>

  <option value="INACTIVE">
    Inativo
  </option>

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
  required
  value={corporateName}
  onChange={(e) =>
    setCorporateName(e.target.value)
  }
/>

</div>

<FormField
label="Nome Fantasia"
value={tradeName}
onChange={(e) =>
  setTradeName(e.target.value)
}
/>

<FormField
label="CPF / CNPJ"
required
value={document}
onChange={(e) =>
  setDocument(e.target.value)
}
/>

<FormField
label="Inscrição Estadual"
value={stateRegistration}
onChange={(e) =>
  setStateRegistration(
    e.target.value,
  )
}
/>

<FormField
label="Inscrição Municipal"
value={municipalRegistration}
onChange={(e) =>
  setMunicipalRegistration(
    e.target.value,
  )
}
/>
<FormField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <FormField
              label="Telefone"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
            />

            <FormField
              label="Celular"
              value={mobilePhone}
              onChange={(e) =>
                setMobilePhone(e.target.value)
              }
            />

            <FormField
              label="Site"
              value={website}
              onChange={(e) =>
                setWebsite(e.target.value)
              }
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

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => {
            setPersonType("JURIDICA");
            setStatus("ACTIVE");
            setCorporateName("");
            setTradeName("");
            setDocument("");
            setStateRegistration("");
            setMunicipalRegistration("");
            setEmail("");
            setPhone("");
            setMobilePhone("");
            setWebsite("");
          }}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading
            ? "Salvando..."
            : "Salvar Cliente"}
        </Button>

      </div>

    </Surface>
      );
    }