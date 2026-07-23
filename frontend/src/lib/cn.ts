import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une classes do Tailwind eliminando conflitos.
 *
 * Exemplo:
 * cn("p-2", "p-4") => "p-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}