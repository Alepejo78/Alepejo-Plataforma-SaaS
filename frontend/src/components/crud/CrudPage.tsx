"use client";

import { ReactNode } from "react";

import { Surface, Typography } from "@/components";

interface CrudPageProps {
  title: string;
  description?: string;
  toolbar: ReactNode;
  table: ReactNode;
  modal?: ReactNode;
}

export function CrudPage({
  title,
  description,
  toolbar,
  table,
  modal,
}: CrudPageProps) {
  return (
    <div className="space-y-8">

      <div>

        <Typography variant="h1">
          {title}
        </Typography>

        {description && (
          <Typography
            variant="body"
            className="text-[var(--text-muted)]"
          >
            {description}
          </Typography>
        )}

      </div>

      <Surface className="rounded-2xl border border-[var(--border)] p-6">
        {toolbar}
      </Surface>

      {table}

      {modal}

    </div>
  );
}