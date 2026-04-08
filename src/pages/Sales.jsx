import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, HandCoins } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";
import { TrendingUp, DollarSign } from "lucide-react";

export default function SalesPage() {
  const [search, setSearch] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sales.list("-sale_date", 200),
  });

  const completed = sales.filter((s) => s.status === "completed");
  const totalRevenue = completed.reduce((s, v) => s + (v.total || 0), 0);
  const totalProfit = completed.reduce((s, v) => s + (v.gross_profit_total || 0), 0);
  const avgMargin = completed.length > 0 ? completed.reduce((s, v) => s + (v.gross_margin_percent || 0), 0) / completed.length : 0;

  const filtered = sales.filter((s) =>
    `${s.sale_number} ${s.customer_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Ventas" subtitle="Historial de ventas y utilidad" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Ingresos Totales" value={formatCurrency(totalRevenue)} icon={DollarSign} />
        <StatCard title="Utilidad Total" value={formatCurrency(totalProfit)} icon={TrendingUp} trendUp />
        <StatCard title="Margen Promedio" value={formatPercent(avgMargin)} icon={HandCoins} />
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar venta…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={HandCoins} title="Sin ventas" description="Las ventas se generan desde cotizaciones aprobadas" />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Utilidad</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.sale_number}</TableCell>
                  <TableCell>{s.customer_name || "—"}</TableCell>
                  <TableCell>{formatDate(s.sale_date)}</TableCell>
                  <TableCell className="capitalize">{s.channel}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(s.total)}</TableCell>
                  <TableCell>{formatCurrency(s.cogs_total)}</TableCell>
                  <TableCell className={`font-semibold ${(s.gross_profit_total || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {formatCurrency(s.gross_profit_total)}
                  </TableCell>
                  <TableCell>{formatPercent(s.gross_margin_percent)}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}