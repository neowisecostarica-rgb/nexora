import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency, formatDate, generateCode } from "@/lib/formatters";

const EMPTY_PO = {
  purchase_code: "", order_number: "", source_platform: "ebay", purchase_date: new Date().toISOString().split("T")[0],
  currency: "USD", items_subtotal: 0, usa_shipping_total: 0, usa_tax_total: 0, discounts_total: 0,
  order_total_paid: 0, total_units: 0, status: "draft", notes: "",
};

export default function Purchases() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PO);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => base44.entities.PurchaseOrders.list("-purchase_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrders.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchaseOrders"] }); setDialogOpen(false); setForm(EMPTY_PO); },
  });

  const openNew = () => {
    setForm({ ...EMPTY_PO, purchase_code: generateCode("PO") });
    setDialogOpen(true);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setNumField = (k, v) => setField(k, v === "" ? 0 : parseFloat(v) || 0);

  const filtered = orders.filter(
    (o) => o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.purchase_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Órdenes de Compra" subtitle="Gestiona compras de equipos">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nueva Compra</Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar orden…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState title="Sin compras" description="Registra tu primera orden de compra" actionLabel="Nueva Compra" onAction={openNew} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Orden #</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Total Pagado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.purchase_code || "—"}</TableCell>
                  <TableCell>{po.order_number}</TableCell>
                  <TableCell className="capitalize">{po.source_platform || "—"}</TableCell>
                  <TableCell>{formatDate(po.purchase_date)}</TableCell>
                  <TableCell>{po.total_units}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(po.order_total_paid)}</TableCell>
                  <TableCell><StatusBadge status={po.status} /></TableCell>
                  <TableCell>
                    <Link to={`/purchases/${po.id}`}>
                      <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input value={form.purchase_code} onChange={(e) => setField("purchase_code", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Orden # *</Label>
              <Input value={form.order_number} onChange={(e) => setField("order_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.source_platform} onValueChange={(v) => setField("source_platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="distributor">Distribuidor</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input type="date" value={form.purchase_date} onChange={(e) => setField("purchase_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Pagado (USD) *</Label>
              <Input type="number" step="0.01" value={form.order_total_paid || ""} onChange={(e) => setNumField("order_total_paid", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Unidades *</Label>
              <Input type="number" value={form.total_units || ""} onChange={(e) => setNumField("total_units", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping USA</Label>
              <Input type="number" step="0.01" value={form.usa_shipping_total || ""} onChange={(e) => setNumField("usa_shipping_total", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tax USA</Label>
              <Input type="number" step="0.01" value={form.usa_tax_total || ""} onChange={(e) => setNumField("usa_tax_total", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="purchased">Comprado</SelectItem>
                  <SelectItem value="in_transit">En Tránsito</SelectItem>
                  <SelectItem value="received">Recibido</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => setField("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={form.notes || ""} onChange={(e) => setField("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.order_number || !form.order_total_paid || createMutation.isPending}>
              {createMutation.isPending ? "Guardando…" : "Crear Orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}