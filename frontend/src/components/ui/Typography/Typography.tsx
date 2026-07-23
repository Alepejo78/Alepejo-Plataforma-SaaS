import { ElementType } from "react";
import { cn } from "@/lib";
import { typographyVariants } from "./Typography.styles";
import { TypographyProps } from "./Typography.types";

const elementMap: Record<string, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  title: "h2",
  body: "p",
  caption: "span",
};

export function Typography({
  variant = "body",
  className,
  ...props
}: TypographyProps) {
  const Component = elementMap[variant];

  return (
    <Component
      className={cn(
        typographyVariants({ variant }),
        className
      )}
      {...props}
    />
  );
}