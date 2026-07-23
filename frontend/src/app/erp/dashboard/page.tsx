"use client";

import {
  Building2,
  CircleDollarSign,
  Package,
  ShoppingCart,
} from "lucide-react";

import {
  DashboardHeader,
  QuickActions,
  RecentActivities,
  RevenueChart,
  SalesChart,
  StatCard,
} from "@/components";

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      <DashboardHeader
        userName="Alessandro"
        companyName="AlePejo ERP Cloud"
      />

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Faturamento"
          value="R$ 458.920"
          subtitle="Últimos 30 dias"
          icon={<CircleDollarSign size={22} />}
          trend={{
            value: 12.8,
            positive: true,
          }}
        />

        <StatCard
          title="Pedidos"
          value="1.248"
          subtitle="Pedidos emitidos"
          icon={<ShoppingCart size={22} />}
          trend={{
            value: 8.3,
            positive: true,
          }}
        />

        <StatCard
          title="Produtos"
          value="8.432"
          subtitle="Produtos cadastrados"
          icon={<Package size={22} />}
          trend={{
            value: 2.1,
            positive: true,
          }}
        />

        <StatCard
          title="Empresas"
          value="18"
          subtitle="Empresas ativas"
          icon={<Building2 size={22} />}
          trend={{
            value: 0,
            positive: true,
          }}
        />

      </section>

      <QuickActions />

      <section className="grid gap-6 xl:grid-cols-2">

        <RevenueChart />

        <SalesChart />

      </section>

      <RecentActivities />

    </div>
  );
}