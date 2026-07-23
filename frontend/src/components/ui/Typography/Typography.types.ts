import { HTMLAttributes } from "react";

export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "caption";

export interface TypographyProps
  extends HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
}