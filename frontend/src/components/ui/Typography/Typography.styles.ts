import { cva } from "class-variance-authority";

export const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "text-5xl font-bold tracking-tight text-[var(--text-primary)]",

      h2: "text-4xl font-bold tracking-tight text-[var(--text-primary)]",

      h3: "text-3xl font-semibold text-[var(--text-primary)]",

      title: "text-xl font-semibold text-[var(--text-primary)]",

      body: "text-base text-[var(--text-secondary)]",

      caption: "text-sm text-[var(--text-muted)]",
    },
  },

  defaultVariants: {
    variant: "body",
  },
});