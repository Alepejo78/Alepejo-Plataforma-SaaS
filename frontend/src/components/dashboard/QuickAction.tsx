"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Surface, Typography } from "@/components";

export interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export function QuickAction({
  title,
  description,
  icon,
  href,
  onClick,
}: QuickActionProps) {
  const content = (
    <Surface
      className="
        h-full
        rounded-2xl
        border
        border-[var(--border)]
        p-5
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[var(--primary)]
        hover:shadow-lg
      "
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between">
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-[var(--surface-hover)]
              text-[var(--primary)]
            "
          >
            {icon}
          </div>

          <ArrowRight
            size={18}
            className="
              opacity-0
              transition-all
              duration-300
              group-hover:translate-x-1
              group-hover:opacity-100
            "
          />
        </div>

        <div className="space-y-2">
          <Typography variant="title">
            {title}
          </Typography>

          <Typography
            variant="body"
            className="text-[var(--text-muted)]"
          >
            {description}
          </Typography>
        </div>
      </div>
    </Surface>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block h-full w-full text-left"
    >
      {content}
    </button>
  );
}