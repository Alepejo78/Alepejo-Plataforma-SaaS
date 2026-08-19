"use client";

import { useRef, useState } from "react";

import { lookupService } from "@/services/lookup.service";
import { maskCEP, isValidCEPLength } from "@/lib/masks";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

export const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

export const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

export interface AddressFormState {
  zipCode: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
}

export const emptyAddress: AddressFormState = {
  zipCode: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
};

/**
 * CEP | Rua | Numero na primeira linha, Bairro | Cidade | UF na
 * segunda — larguras proporcionais (CEP e Número pequenos, Rua e
 * Bairro maiores). O container precisa usar grid de 6 colunas
 * (`sm:grid-cols-6`) pros spans abaixo baterem certinho em cada linha.
 */
export function AddressFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: AddressFormState;
  onChange: (next: AddressFormState) => void;
}) {
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const numberRef = useRef<HTMLInputElement>(null);

  async function handleCepLookup(cep: string) {
    setLoadingCep(true);
    setCepError("");

    try {
      const result = await lookupService.cep(cep);

      onChange({
        ...value,
        street: result.street || value.street,
        district: result.district || value.district,
        city: result.city || value.city,
        state: result.state || value.state,
      });

      numberRef.current?.focus();
    } catch (err) {
      setCepError(extractMessage(err, "CEP não encontrado."));
    } finally {
      setLoadingCep(false);
    }
  }

  return (
    <>
      <div className="sm:col-span-1">
        <label className={labelClass} htmlFor={`${idPrefix}-zipCode`}>
          CEP
        </label>

        <input
          id={`${idPrefix}-zipCode`}
          inputMode="numeric"
          placeholder="00000-000"
          className={fieldClass}
          value={value.zipCode}
          onChange={(e) => {
            const masked = maskCEP(e.target.value);

            onChange({ ...value, zipCode: masked });

            if (isValidCEPLength(masked)) {
              void handleCepLookup(masked);
            }
          }}
        />

        {loadingCep && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Buscando endereço...
          </p>
        )}

        {cepError && (
          <p className="mt-1 text-xs text-[var(--danger)]">{cepError}</p>
        )}
      </div>

      <div className="sm:col-span-4">
        <label className={labelClass} htmlFor={`${idPrefix}-street`}>
          Rua
        </label>

        <input
          id={`${idPrefix}-street`}
          className={fieldClass}
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
        />
      </div>

      <div className="sm:col-span-1">
        <label className={labelClass} htmlFor={`${idPrefix}-number`}>
          Número
        </label>

        <input
          id={`${idPrefix}-number`}
          ref={numberRef}
          className={fieldClass}
          value={value.number}
          onChange={(e) => onChange({ ...value, number: e.target.value })}
        />
      </div>

      <div className="sm:col-span-3">
        <label className={labelClass} htmlFor={`${idPrefix}-district`}>
          Bairro
        </label>

        <input
          id={`${idPrefix}-district`}
          className={fieldClass}
          value={value.district}
          onChange={(e) =>
            onChange({ ...value, district: e.target.value })
          }
        />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`${idPrefix}-city`}>
          Cidade
        </label>

        <input
          id={`${idPrefix}-city`}
          className={fieldClass}
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        />
      </div>

      <div className="sm:col-span-1">
        <label className={labelClass} htmlFor={`${idPrefix}-state`}>
          UF
        </label>

        <input
          id={`${idPrefix}-state`}
          maxLength={2}
          className={`${fieldClass} uppercase`}
          value={value.state}
          onChange={(e) =>
            onChange({ ...value, state: e.target.value.toUpperCase() })
          }
        />
      </div>
    </>
  );
}
