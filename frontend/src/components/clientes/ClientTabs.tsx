"use client";

interface ClientTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

const tabs = [
  { id: "geral", label: "Geral" },
  { id: "endereco", label: "Endereço" },
  { id: "contatos", label: "Contatos" },
  { id: "fiscal", label: "Fiscal" },
  { id: "financeiro", label: "Financeiro" },
  { id: "comercial", label: "Comercial" },
  { id: "transportes", label: "Transportes" },
  { id: "observacoes", label: "Observações" },
  { id: "anexos", label: "Anexos" },
  { id: "historico", label: "Histórico" },
];

export function ClientTabs({
  activeTab,
  onChange,
}: ClientTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 border-b border-[var(--border)] pb-2">

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              rounded-xl
              px-5
              py-2.5
              text-sm
              font-medium
              transition-all
              whitespace-nowrap
              ${
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white shadow-md"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              }
            `}
          >
            {tab.label}
          </button>
        ))}

      </div>
    </div>
  );
}