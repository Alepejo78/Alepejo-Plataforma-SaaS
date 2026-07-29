import { AppShell } from "@/components";
import {
  DashboardHeader,
  QuickAction,
  RecentActivities,
  StatCard,
} from "@/components/dashboard";

import {
  DollarSign,
  Package,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <DashboardHeader />

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Faturamento"
            value="R$ 1.250.000"
            icon={DollarSign}
            variation="+12%"
          />

          <StatCard
            title="Pedidos"
            value="238"
            icon={ShoppingCart}
            variation="+8%"
          />

          <StatCard
            title="Produtos"
            value="3.254"
            icon={Package}
            variation="+2%"
          />

          <StatCard
            title="Clientes"
            value="1.842"
            icon={Users}
            variation="+18%"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RecentActivities />
          </div>

          <div>
            <QuickAction
              title="Novo Cliente"
              description="Cadastrar um novo cliente"
              icon={<UserPlus size={22} />}
              href="/erp/clientes"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}