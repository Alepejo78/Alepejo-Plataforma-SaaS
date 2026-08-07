"use client";

import { useMemo, useState } from "react";

interface SaleItem {
  id: number;
  product: string;
  quantity: number;
  unitPrice: number;
}

export function SaleForm() {
  const [client, setClient] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const [items, setItems] = useState<SaleItem[]>([]);

  function addItem() {
    if (!product.trim()) return;

    setItems((old) => [
      ...old,
      {
        id: Date.now(),
        product,
        quantity,
        unitPrice,
      },
    ]);

    setProduct("");
    setQuantity(1);
    setUnitPrice(0);
  }

  function removeItem(id: number) {
    setItems((old) => old.filter((x) => x.id !== id));
  }

  const total = useMemo(() => {
    return items.reduce(
      (acc, item) =>
        acc + item.quantity * item.unitPrice,
      0,
    );
  }, [items]);

  return (
    <div className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2">

        <div>
          <label className="mb-2 block text-sm font-medium">
            Cliente
          </label>

          <input
            value={client}
            onChange={(e) =>
              setClient(e.target.value)
            }
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            placeholder="Pesquisar cliente..."
          />
        </div>

      </div>

      <div className="rounded-xl border border-[var(--border)] p-4">

        <h3 className="mb-4 font-semibold">
          Adicionar Produto
        </h3>

        <div className="grid gap-3 md:grid-cols-4">

          <input
            value={product}
            onChange={(e) =>
              setProduct(e.target.value)
            }
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            placeholder="Produto"
          />

          <input
            type="number"
            value={quantity}
            onChange={(e) =>
              setQuantity(Number(e.target.value))
            }
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            placeholder="Qtde"
          />

          <input
            type="number"
            value={unitPrice}
            onChange={(e) =>
              setUnitPrice(Number(e.target.value))
            }
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            placeholder="Valor"
          />

          <button
            onClick={addItem}
            className="rounded-xl bg-[var(--primary)] text-white"
          >
            Adicionar
          </button>

        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">

        <table className="w-full">

          <thead className="bg-[var(--surface-hover)]">

            <tr>

              <th className="p-3 text-left">
                Produto
              </th>

              <th className="p-3 text-center">
                Qtde
              </th>

              <th className="p-3 text-right">
                Unitário
              </th>

              <th className="p-3 text-right">
                Total
              </th>

              <th></th>

            </tr>

          </thead>

          <tbody>

            {items.map((item) => (

              <tr key={item.id}>

                <td className="p-3">
                  {item.product}
                </td>

                <td className="text-center">
                  {item.quantity}
                </td>

                <td className="text-right pr-3">
                  {item.unitPrice.toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    },
                  )}
                </td>

                <td className="text-right pr-3">
                  {(
                    item.quantity *
                    item.unitPrice
                  ).toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    },
                  )}
                </td>

                <td className="text-center">

                  <button
                    onClick={() =>
                      removeItem(item.id)
                    }
                    className="text-red-600"
                  >
                    Excluir
                  </button>

                </td>

              </tr>

            ))}

            {items.length === 0 && (

              <tr>

                <td
                  colSpan={5}
                  className="p-8 text-center text-[var(--text-muted)]"
                >
                  Nenhum item informado.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

      <div className="flex justify-end">

        <div className="w-72 rounded-xl border border-[var(--border)] p-5">

          <div className="flex justify-between text-lg font-semibold">

            <span>Total</span>

            <span>
              {total.toLocaleString(
                "pt-BR",
                {
                  style: "currency",
                  currency: "BRL",
                },
              )}
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}