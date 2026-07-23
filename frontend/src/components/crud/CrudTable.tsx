"use client";

import { ReactNode } from "react";

import { Surface, Typography } from "@/components";

export interface CrudColumn<T> {
  id: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  cell: (row: T) => ReactNode;
}

interface CrudTableProps<T> {
  columns: CrudColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export function CrudTable<T extends { id: number | string }>({
  columns,
  data,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
}: CrudTableProps<T>) {
  return (
    <Surface className="overflow-hidden rounded-2xl border border-[var(--border)]">

      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="border-b border-[var(--border)] bg-[var(--surface-hover)]">

            <tr>

              {columns.map((column) => (

                <th
                  key={column.id}
                  style={{
                    width: column.width,
                  }}
                  className={`
                    px-5
                    py-4
                    text-sm
                    font-semibold

                    ${
                      column.align === "center"
                        ? "text-center"
                        : column.align === "right"
                        ? "text-right"
                        : "text-left"
                    }
                  `}
                >
                  {column.header}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>

                <td
                  colSpan={columns.length}
                  className="py-16 text-center"
                >
                  <Typography variant="body">
                    Carregando...
                  </Typography>
                </td>

              </tr>

            ) : data.length === 0 ? (

              <tr>

                <td
                  colSpan={columns.length}
                  className="py-16 text-center"
                >
                  <Typography variant="body">
                    {emptyMessage}
                  </Typography>
                </td>

              </tr>

            ) : (

              data.map((row) => (

                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
                >

                  {columns.map((column) => (

                    <td
                      key={column.id}
                      className={`
                        px-5
                        py-4

                        ${
                          column.align === "center"
                            ? "text-center"
                            : column.align === "right"
                            ? "text-right"
                            : "text-left"
                        }
                      `}
                    >
                      {column.cell(row)}
                    </td>

                  ))}

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </Surface>
  );
}