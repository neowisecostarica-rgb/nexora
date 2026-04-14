import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Monitor, ShoppingCart, HandCoins, TrendingUp, Package, AlertTriangle, DollarSign, Truck
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";

const COLORS = ["hsl(217,91%,60%)", "hsl(162,72%,45%)", "hsl(262,83%,58%)", "hsl(43,96%,56%)", "hsl(0,84%,60%)"];

export default function Dashboard() {
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryUnits.list("-created_date", 200),
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sales.list("-sale_date", 100),
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.PurchaseOrders.list("-purchase_date", 100),
  });

  const available = inventory.filter((u) => u.status === "available");
  const totalInventoryValue = available.reduce((s, u) => s + (u.total_real_unit_cost || 0), 0);
  const totalWholesaleValue = available.reduce((s, u) => s + (u.wholesale_price || 0), 0);
  const potentialProfit = totalWholesaleValue - totalInventoryValue;

  const readyToQuote = available.filter(u => u.wholesale_price > 0 && u.pricing_profile_id);

  const completedSales = sales.filter((s) => s.status === "completed");
  const totalRevenue = completedSales.reduce((s, v) => s + (v.total || 0), 0);
  const totalProfit = completedSales.reduce((s, v) => s + (v.gross_profit_total || 0), 0);

  const brandCounts = {};
  available.forEach((u) => {
    brandCounts[u.brand] = (brandCounts[u.brand] || 0) + 1;
  });
  const brandData = Object.entries(brandCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const statusCounts = {};
  inventory.forEach((u) => {
    statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Vista general del negocio" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Disponibles para Vender" value={formatNumber(available.length)} subtitle={`${readyToQuote.length} listos para cotizar`} icon={Monitor} />
        <StatCard title="Valor en Inventario" value={formatCurrency(totalInventoryValue)} subtitle="costo real total" icon={Package} />
        <StatCard title="Utilidad Potencial Mayoreo" value={formatCurrency(potentialProfit)} subtitle="precio mayoreo − costo real" icon={TrendingUp} />
        <StatCard title="Ventas Completadas" value={formatCurrency(totalRevenue)} subtitle={`${completedSales.length} ventas`} icon={HandCoins} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Inventario por Marca</CardTitle>
          </CardHeader>
          <CardContent>
            {brandData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={brandData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(217,91%,60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Sin datos de inventario
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Estado del Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Sin datos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Últimas Compras</CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin compras registradas</p>
            ) : (
              <div className="space-y-3">
                {purchases.slice(0, 5).map((po) => (
                  <div key={po.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{po.order_number}</p>
                      <p className="text-xs text-muted-foreground">{po.total_units} unidades</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(po.order_total_paid)}</span>
                      <StatusBadge status={po.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Últimas Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin ventas registradas</p>
            ) : (
              <div className="space-y-3">
                {sales.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.sale_number}</p>
                      <p className="text-xs text-muted-foreground">{s.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(s.total)}</span>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}