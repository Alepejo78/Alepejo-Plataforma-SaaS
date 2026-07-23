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

    "focus-visible:ring-2",

    "focus-visible:ring-zinc-900/20",
  ],

  {
    variants: {

      variant: {

        primary: [

          "bg-zinc-950",

          "text-white",

          "shadow-sm",

          "hover:bg-zinc-800",

        ],

        secondary: [

          "bg-white",

          "border",

          "border-zinc-200",

          "text-zinc-900",

          "hover:bg-zinc-50",

        ],

        outline: [

          "border",

          "border-zinc-300",

          "bg-transparent",

          "hover:bg-zinc-100",

        ],

        ghost: [

          "hover:bg-zinc-100",

          "text-zinc-800",

        ],

        success: [

          "bg-emerald-600",

          "text-white",

          "hover:bg-emerald-700",

        ],

        danger: [

          "bg-red-600",

          "text-white",

          "hover:bg-red-700",

        ],

      },

      size: {

        sm: [

          "h-9",

          "px-4",

          "text-sm",

        ],

        md: [

          "h-11",

          "px-5",

          "text-sm",

        ],

        lg: [

          "h-12",

          "px-6",

          "text-base",

        ],

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