"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib";

import { MenuItem } from "./Sidebar.types";
import { sidebarStyles } from "./Sidebar.styles";

interface Props {
  item: MenuItem;
  collapsed: boolean;
}

export function SidebarItem({
  item,
  collapsed,
}: Props) {
  const pathname = usePathname();

  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={cn(
        sidebarStyles.navigationItem,
        active && sidebarStyles.navigationItemActive,
        collapsed
          ? "justify-center px-0"
          : "justify-start gap-3 px-4"
      )}
    >
      <Icon
        size={20}
        className="shrink-0"
      />

      {!collapsed && (
        <span className="truncate">
          {item.title}
        </span>
      )}
    </Link>
  );
}