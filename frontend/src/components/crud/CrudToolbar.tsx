"use client";

import { Download, Filter, Plus, Search } from "lucide-react";

import { Button } from "@/components";

interface CrudToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  onNew: () => void;
  onFilter?: () => void;
  onExport?: () => void;
  placeholder?: string;
  newLabel?: string;
}

export function CrudToolbar({
  search,
  onSearch,
  onNew,
  onFilter,
  onExport,
  placeholder = "Pesquisar...",
  newLabel = "Novo",
}: CrudToolbarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

      <div className="relative w-full max-w-xl">

        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />

        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="
            h-11
            w-full
            rounded-xl
            border
            border-[var(--border)]
            bg-[var(--background)]
            pl-11
            pr-4
            outline-none
            transition-all
            focus:border-[var(--primary)]
            focus:ring-2
            focus:ring-[var(--primary)]/20
          "
        />

      </div>

      <div className="flex flex-wrap gap-3">

        <Button
          variant="outline"
          onClick={onFilter}
        >
          <Filter size={18} />
          Filtros
        </Button>

        <Button
          variant="outline"
          onClick={onExport}
        >
          <Download size={18} />
          Exportar
        </Button>

        <Button onClick={onNew}>
          <Plus size={18} />
          {newLabel}
        </Button>

      </div>

    </div>
  );
}
