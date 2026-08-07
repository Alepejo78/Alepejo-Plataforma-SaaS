import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "rounded-2xl",
    "font-medium",
    "transition-all",
    "duration-200",
    "select-none",
    "outline-none",
    "active:scale-[0.98]",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
  ],

  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--primary)]",
          "text-[var(--primary-contrast)]",
          "shadow-sm",
          "hover:bg-[var(--primary-hover)]",
        ],

        secondary: [
          "bg-[var(--surface)]",
          "border",
          "border-[var(--border)]",
          "text-[var(--text-primary)]",
          "hover:bg-[var(--surface-hover)]",
          "hover:border-[var(--border-strong)]",
        ],

        outline: [
          "border",
          "border-[var(--border-strong)]",
          "bg-transparent",
          "text-[var(--text-primary)]",
          "hover:bg-[var(--surface-hover)]",
        ],

        ghost: [
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)]",
          "hover:text-[var(--text-primary)]",
        ],

        success: [
          "bg-[var(--success)]",
          "text-white",
          "hover:opacity-90",
        ],

        danger: [
          "bg-[var(--danger)]",
          "text-white",
          "hover:opacity-90",
        ],
      },

      size: {
        sm: ["h-9", "px-4", "text-sm"],
        md: ["h-11", "px-5", "text-sm"],
        lg: ["h-12", "px-6", "text-base"],
      },

      fullWidth: {
        true: "w-full",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);
