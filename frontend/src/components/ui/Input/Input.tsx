import { cn } from "@/lib";
import { inputVariants } from "./Input.styles";
import type { InputProps } from "./Input.types";

export function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">

      {label && (
        <label className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}

      <div className="relative">

        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
            {leftIcon}
          </div>
        )}

        <input
          className={cn(
            inputVariants(),
            leftIcon && "pl-11",
            rightIcon && "pr-11",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
            {rightIcon}
          </div>
        )}

      </div>

      {error ? (
        <p className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        helperText && (
          <p className="text-sm text-zinc-500">
            {helperText}
          </p>
        )
      )}

    </div>
  );
}