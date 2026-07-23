"use client";

import { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

export function FormField({
  label,
  required = false,
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">

      <label className="text-sm font-medium">

        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}

      </label>

      <input
        {...props}
        className={`
          h-11
          rounded-xl
          border
          border-[var(--border)]
          bg-[var(--background)]
          px-4
          outline-none
          transition-all
          focus:border-[var(--primary)]
          focus:ring-2
          focus:ring-[var(--primary)]/20
          ${className}
        `}
      />

    </div>
  );
}