"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Loader2, Plus, X } from "lucide-react";

interface SearchSelectProps<T> {
  /** Texto exibido no campo quando algo está selecionado. */
  displayLabel?: string;

  /** Chamado ao selecionar um item (ou `null` ao limpar). */
  onSelect: (item: T | null) => void;

  /** Busca os resultados para o texto digitado (debounce já embutido). */
  search: (query: string) => Promise<T[]>;

  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string | undefined;

  /**
   * Quando informado, mostra uma opção "Criar <texto>" no dropdown
   * se não houver um resultado com o mesmo nome. Usado para permitir
   * cadastrar um item novo sem sair do formulário atual.
   */
  onCreate?: (query: string) => Promise<T>;

  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Campo de busca com sugestões (autocomplete). Ao digitar, chama `search`
 * com debounce e mostra os resultados num dropdown; ao focar sem digitar,
 * já mostra uma lista inicial.
 */
export function SearchSelect<T>({
  displayLabel,
  onSelect,
  search,
  getId,
  getLabel,
  getSubLabel,
  onCreate,
  placeholder = "Buscar...",
  disabled,
  className = "",
}: SearchSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          e.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      onClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        onClickOutside
      );
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);

    const timer = setTimeout(() => {
      searchRef
        .current(query)
        .then((items) => {
          setResults(items);
          setHighlighted(0);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [open, query]);

  function selectItem(item: T) {
    onSelect(item);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onSelect(null);
    setQuery("");
  }

  async function createNew() {
    if (!onCreate) {
      return;
    }

    const value = query.trim();

    if (!value) {
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const item = await onCreate(value);

      selectItem(item);
    } catch {
      setCreateError("Não foi possível criar.");
    } finally {
      setCreating(false);
    }
  }

  const exactMatch = results.some(
    (item) =>
      getLabel(item).trim().toLowerCase() ===
      query.trim().toLowerCase()
  );

  const showCreate =
    Boolean(onCreate) &&
    query.trim().length > 0 &&
    !exactMatch &&
    !loading;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : (displayLabel ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (!open) {
            return;
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) =>
              Math.min(h + 1, results.length - 1)
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();

            if (results[highlighted]) {
              selectItem(results[highlighted]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`
          h-11 w-full rounded-xl border border-[var(--border)]
          bg-[var(--surface)] px-3 ${displayLabel ? "pr-8" : ""} text-sm
          text-[var(--text-primary)] outline-none transition-colors
          focus:border-[var(--primary)]
        `}
      />

      {displayLabel && !open && !disabled && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar seleção"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" />
              Buscando...
            </div>
          ) : (
            <>
              {results.length === 0 && !showCreate && (
                <div className="p-3 text-sm text-[var(--text-muted)]">
                  Nenhum resultado
                </div>
              )}

              {results.map((item, i) => (
                <button
                  key={getId(item)}
                  type="button"
                  onClick={() => selectItem(item)}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === highlighted
                      ? "bg-[var(--surface-hover)]"
                      : ""
                  }`}
                >
                  <p className="font-medium text-[var(--text-primary)]">
                    {getLabel(item)}
                  </p>

                  {getSubLabel?.(item) && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {getSubLabel(item)}
                    </p>
                  )}
                </button>
              ))}

              {showCreate && (
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void createNew()}
                  className="flex w-full items-center gap-1.5 border-t border-[var(--border)] px-3 py-2 text-left text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  <Plus size={14} />
                  {creating
                    ? "Criando..."
                    : `Criar "${query.trim()}"`}
                </button>
              )}

              {createError && (
                <div className="px-3 py-2 text-xs text-[var(--danger)]">
                  {createError}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
