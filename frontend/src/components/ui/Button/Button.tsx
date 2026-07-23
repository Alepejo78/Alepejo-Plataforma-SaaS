import { Loader2 } from "lucide-react";

import { cn } from "@/lib";

import { buttonVariants } from "./Button.styles";

import { ButtonProps } from "./Button.types";

export function Button({

  children,

  variant,

  size,

  loading,

  fullWidth,

  leftIcon,

  rightIcon,

  className,

  ...props

}: ButtonProps) {

  return (

    <button

      className={cn(
        buttonVariants({
          variant,
          size,
          fullWidth,
        }),
        className
      )}

      disabled={loading || props.disabled}

      {...props}

    >

      {loading && (
        <Loader2
          size={16}
          className="animate-spin"
        />
      )}

      {!loading && leftIcon}

      <span>{children}</span>

      {!loading && rightIcon}

    </button>

  );

}