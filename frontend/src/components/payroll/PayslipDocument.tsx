import { Printer } from "lucide-react";

export interface PayslipEmployee {
  id: string;
  name: string;
  employeeNumber?: number | null;
  cpf?: string | null;
  admissionDate?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  jobFunction?: { name: string } | null;
}

export interface PayslipLine {
  id: string;
  type: "PROVENTO" | "DESCONTO";
  code: string;
  description: string;
  referenceValue?: string | null;
  amount: string | number;
}

export interface PayslipFooterField {
  label: string;
  value: string;
}

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function datetime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("pt-BR");
}

/**
 * Layout clássico de "demonstrativo de pagamento" (monoespaçado,
 * caixa com bordas, colunas Cod./Descrição/Unidade/Proventos/
 * Descontos + rodapé com bases de INSS/IRRF) — pedido explícito do
 * usuário com uma folha real de outro sistema como referência.
 * Reaproveitado pelos 3 recibos (Folha, 13º, Férias): cada chamador só
 * passa os campos que tem (o layout não exige nenhum específico de um
 * documento só).
 */
export function PayslipDocument({
  companyName,
  companyDocument,
  logoUrl,
  title,
  periodLabel,
  paymentDateLabel,
  employee,
  baseSalary,
  hourlyRate,
  lines,
  footerFields,
  confirmation,
}: {
  companyName: string;
  companyDocument?: string;
  /** Logo da empresa (módulo Personalização) — só mostra se configurada e habilitada; sem isso, cabeçalho fica só com o nome, como já era. */
  logoUrl?: string | null;
  title: string;
  periodLabel: string;
  paymentDateLabel?: string;
  employee: PayslipEmployee;
  baseSalary?: number;
  hourlyRate?: number;
  lines: PayslipLine[];
  footerFields: PayslipFooterField[];
  /** Confirmação digital de recebimento — quando confirmado, substitui a linha em branco de assinatura por "Assinado digitalmente" + data/hora. */
  confirmation?: {
    status: "PENDENTE" | "CONFIRMADO";
    confirmedAt?: string | null;
  };
}) {
  const totalProventos = lines
    .filter((l) => l.type === "PROVENTO")
    .reduce((sum, l) => sum + num(l.amount), 0);

  const totalDescontos = lines
    .filter((l) => l.type === "DESCONTO")
    .reduce((sum, l) => sum + num(l.amount), 0);

  const netAmount = totalProventos - totalDescontos;

  const generatedAt = new Date().toLocaleString("pt-BR", {
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto max-w-3xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page { size: portrait; margin: 12mm; }
        }
      `}</style>

      <div className="mb-4 flex items-center justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>

      <div className="border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] print:border-black print:text-black">
        <div className="flex items-start justify-between border-b border-[var(--border)] p-3 print:border-black">
          <div className="flex items-center gap-2">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 object-contain"
              />
            )}

            <div>
              <p className="font-bold">{companyName}</p>
              <p>Matriz</p>
            </div>
          </div>

          {companyDocument && <p>{companyDocument}</p>}
        </div>

        <div className="border-b border-[var(--border)] py-2 text-center font-bold tracking-[0.2em] print:border-black">
          {title}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-3 print:border-black">
          <span>{periodLabel}</span>
          {paymentDateLabel && <span>{paymentDateLabel}</span>}
          <span>Emitido em {generatedAt}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 border-b border-[var(--border)] p-3 print:border-black">
          <span>
            Matrícula: {employee.employeeNumber ?? "—"} — Nome:{" "}
            {employee.name}
          </span>
          <span>CPF: {employee.cpf ?? "—"}</span>
          <span>Admissão: {date(employee.admissionDate)}</span>
          <span>Cargo: {employee.jobFunction?.name ?? "—"}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 border-b border-[var(--border)] p-3 print:border-black">
          <span>
            Salário Base:{" "}
            {baseSalary !== undefined ? money(baseSalary) : "—"}
          </span>
          <span>
            Salário Hora: {hourlyRate !== undefined ? money(hourlyRate) : "—"}
          </span>
          <span>
            Banco/Agência: {employee.bankName ?? "—"} /{" "}
            {employee.bankAgency ?? "—"}
          </span>
          <span>C/C: {employee.bankAccount ?? "—"}</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] print:border-black">
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">
                Cod.
              </th>
              <th className="px-2 py-1.5 font-semibold">Descrição</th>
              <th className="px-2 py-1.5 text-right font-semibold">
                Unidade
              </th>
              <th className="px-2 py-1.5 text-right font-semibold">
                Proventos
              </th>
              <th className="px-2 py-1.5 text-right font-semibold">
                Descontos
              </th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="whitespace-nowrap px-2 py-1">{line.code}</td>
                <td className="px-2 py-1">{line.description}</td>
                <td className="px-2 py-1 text-right">
                  {line.referenceValue ?? ""}
                </td>
                <td className="px-2 py-1 text-right">
                  {line.type === "PROVENTO" ? money(line.amount) : ""}
                </td>
                <td className="px-2 py-1 text-right">
                  {line.type === "DESCONTO" ? money(line.amount) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-5 border-y border-[var(--border)] p-2 print:border-black">
          <span className="col-span-3 font-semibold">Total</span>
          <span className="text-right font-semibold">
            {money(totalProventos)}
          </span>
          <span className="text-right font-semibold">
            {money(totalDescontos)}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 font-semibold">
          <span>Líquido</span>
          <span>{money(netAmount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--border)] p-3 print:border-black">
          {footerFields.map((f) => (
            <span key={f.label}>
              {f.label}: {f.value}
            </span>
          ))}
        </div>

        <div className="mt-8 px-3 pb-6 text-center">
          <div className="mx-auto w-2/3 border-t border-[var(--border)] pt-1 print:border-black">
            {confirmation?.status === "CONFIRMADO" ? (
              <>
                <span className="italic">Assinado digitalmente</span>
                {confirmation.confirmedAt && (
                  <>
                    <br />
                    {datetime(confirmation.confirmedAt)}
                  </>
                )}
              </>
            ) : (
              "Assinatura do colaborador"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
