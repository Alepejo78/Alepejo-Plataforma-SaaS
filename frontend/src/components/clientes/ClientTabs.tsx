"use client";

interface ClientTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

const tabs = [
  {
    id: "geral",
    label: "Geral",
  },
  {
    id: "endereco",
    label: "Endereço",
  },
  {
    id: "financeiro",
    label: "Financeiro",
  },
  {
    id: "observacoes",
    label: "Observações",
  },
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
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              rounded-xl
              px-5
              py-2.5
              text-sm
              font-medium
              whitespace-nowrap
              transition-all
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