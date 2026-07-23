import { cn } from "@/lib";
import type { SurfaceProps } from "./Surface.types";

export function Surface({
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <section
      className={cn(
        "rounded-3xl",
        "border",
        "border-zinc-200/80",
        "bg-white",
        "shadow-sm",
        "transition-all",
        "duration-200",
        "hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}