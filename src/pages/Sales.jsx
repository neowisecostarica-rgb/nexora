import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, HandCoins, ExternalLink } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";
import { TrendingUp, DollarSign } from "lucide-react";

const SALE_TYPE_LABELS = {
  retail: "Retail",
  wholesale: "Mayoreo",
  reseller: "Revendedor",
  internal: "Interno",
};

const EXT_INVOICE_COLORS = {
  none: "secondary",
  pending: "outline",
  issued: "default",
};

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [invoiceDialog, setInvoiceDialog] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ external_invoice_reference: "", external_invoice_status: "pending" });
  const qc = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sales.list("-sale_date", 200),
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sales.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      setInvoiceDialog(null);
    },
  });

  const completed = sales.filter((s) => s.status === "completed");
  const totalRevenue = completed.reduce((s, v) => s + (v.total || 0), 0);
  const totalProfit = completed.reduce((s, v) => s + (v.gross_profit_total || 0), 0);
  const avgMargin = completed.length > 0
    ? completed.reduce((s, v) => s + (v.gross_margin_percent || 0), 0) / completed.length
    : 0;
  const wholesaleCount = completed.filter(s => s.sale_type === "wholesale" || s.channel === "wholesale").length;

  const filtered = sales.filter((s) =>
    `${s.sale_number} ${s.customer_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const openInvoiceDialog = (sale) => {
    setInvoiceDialog(sale);
    setInvoiceForm({
      external_invoice_reference: sale.external_invoice_reference || "",
      external_invoice_status: sale.external_invoice_status || "pending",
    });
  };

  return (
    <div>
      <PageHeader title="Ventas" subtitle="Historial de ventas y utilidad" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Ingresos Totales" value={formatCurrency(totalRevenue)} icon={DollarSign} />
        <StatCard title="Utilidad Total" value={formatCurrency(totalProfit)} icon={TrendingUp} trendUp />
        <StatCard title="Margen Promedio" value={formatPercent(avgMargin)} icon={HandCoins} />
        <StatCard title="Ventas Mayoreo" value={wholesaleCount} subtitle="completadas" icon={HandCoins} />
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
                <TableHead>Tipo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Utilidad</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Factura Ext.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium font-mono text-xs">{s.sale_number}</TableCell>
                  <TableCell>{s.customer_name || "—"}</TableCell>
                  <TableCell>{formatDate(s.sale_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {SALE_TYPE_LABELS[s.sale_type] || SALE_TYPE_LABELS[s.channel] || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(s.total)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatCurrency(s.cogs_total)}</TableCell>
                  <TableCell className={`font-semibold ${(s.gross_profit_total || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {formatCurrency(s.gross_profit_total)}
                  </TableCell>
                  <TableCell>{formatPercent(s.gross_margin_percent)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => openInvoiceDialog(s)}
                      className="flex items-center gap-1 text-xs hover:text-primary transition-colors"
                    >
                      <Badge variant={EXT_INVOICE_COLORS[s.external_invoice_status] || "secondary"} className="text-xs cursor-pointer">
                        {s.external_invoice_status === "issued" ? "Emitida" : s.external_invoice_status === "pending" ? "Pendiente" : "Sin factura"}
                      </Badge>
                      {s.external_invoice_reference && <ExternalLink className="w-3 h-3" />}
                    </button>
                  </TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Referencia de Factura Externa */}
      <Dialog open={!!invoiceDialog} onOpenChange={(o) => { if (!o) setInvoiceDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Factura Externa — {invoiceDialog?.sale_number}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">
            Este campo registra la referencia de la factura fiscal emitida externamente. No genera comprobantes fiscales.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Estado de Factura</Label>
              <Select value={invoiceForm.external_invoice_status} onValueChange={(v) => setInvoiceForm(f => ({ ...f, external_invoice_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin factura</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="issued">Emitida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Referencia / Número de Factura</Label>
              <Input value={invoiceForm.external_invoice_reference} onChange={e => setInvoiceForm(f => ({ ...f, external_invoice_reference: e.target.value }))} placeholder="Ej. FE-001-2024-0001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => updateInvoiceMutation.mutate({ id: invoiceDialog.id, data: invoiceForm })}
              disabled={updateInvoiceMutation.isPending}
            >
              {updateInvoiceMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}