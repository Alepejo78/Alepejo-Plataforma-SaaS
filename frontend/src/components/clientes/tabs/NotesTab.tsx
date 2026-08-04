"use client";

interface NotesTabProps {
  form: {
    observations: string;
  };
  onChange: (field: string, value: string) => void;
}

export function NotesTab({
  form,
  onChange,
}: NotesTabProps) {
  return (
    <div className="space-y-6">

      <div>

        <label className="mb-2 block text-sm font-medium">
          Observações
        </label>

        <textarea
          rows={12}
          value={form.observations}
          onChange={(e) =>
            onChange(
              "observations",
              e.target.value,
            )
          }
          placeholder="Informe observações sobre o cliente..."
          className="
            w-full
            rounded-xl
            border
            border-[var(--border)]
            bg-[var(--background)]
            px-4
            py-3
            resize-none
            outline-none
            focus:border-[var(--primary)]
          "
        />

      </div>

    </div>
  );
}