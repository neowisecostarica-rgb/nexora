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
import { Plus, Truck } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency, formatDate, generateCode } from "@/lib/formatters";

const EMPTY_BATCH = {
  batch_code: "", courier: "", origin_country: "USA", destination_country: "Mexico",
  ship_date: "", arrival_date: "", customs_total: 0, freight_total: 0,
  local_transport_total: 0, per_unit_import_default: 0, extra_cost_total: 0,
  total_units: 0, notes: "", status: "planning",
};

export default function ImportBatchesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BATCH);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["importBatches"],
    queryFn: () => base44.entities.ImportBatches.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const totalImport = (data.customs_total || 0) + (data.freight_total || 0) + (data.local_transport_total || 0) + (data.extra_cost_total || 0);
      const perUnit = data.total_units > 0 ? totalImport / data.total_units : 0;
      const payload = { ...data, per_unit_import_default: perUnit };
      return editing ? base44.entities.ImportBatches.update(editing.id, payload) : base44.entities.ImportBatches.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["importBatches"] }); setDialogOpen(false); setEditing(null); setForm(EMPTY_BATCH); },
  });

  const openNew = () => { setForm({ ...EMPTY_BATCH, batch_code: generateCode("IMP") }); setEditing(null); setDialogOpen(true); };
  const openEdit = (b) => { setForm(b); setEditing(b); setDialogOpen(true); };

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const snf = (k, v) => sf(k, v === "" ? 0 : parseFloat(v) || 0);

  const totalImportCost = (f) => (f.customs_total || 0) + (f.freight_total || 0) + (f.local_transport_total || 0) + (f.extra_cost_total || 0);

  return (
    <div>
      <PageHeader title="Importaciones" subtitle="Lotes de importación y costos asociados">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Lote</Button>
      </PageHeader>

      {batches.length === 0 && !isLoading ? (
        <EmptyState icon={Truck} title="Sin importaciones" description="Registra un lote de importación" actionLabel="Nuevo Lote" onAction={openNew} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Envío</TableHead>
                <TableHead>Llegada</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Costo Total</TableHead>
                <TableHead>Costo/Unidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const total = (b.customs_total || 0) + (b.freight_total || 0) + (b.local_transport_total || 0) + (b.extra_cost_total || 0);
                return (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(b)}>
                    <TableCell className="font-medium">{b.batch_code}</TableCell>
                    <TableCell>{b.courier || "—"}</TableCell>
                    <TableCell>{formatDate(b.ship_date)}</TableCell>
                    <TableCell>{formatDate(b.arrival_date)}</TableCell>
                    <TableCell>{b.total_units}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(total)}</TableCell>
                    <TableCell>{b.total_units > 0 ? formatCurrency(total / b.total_units) : "—"}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar Lote" : "Nuevo Lote de Importación"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Código</Label><Input value={form.batch_code} onChange={(e) => sf("batch_code", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Courier</Label><Input value={form.courier || ""} onChange={(e) => sf("courier", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fecha Envío</Label><Input type="date" value={form.ship_date || ""} onChange={(e) => sf("ship_date", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fecha Llegada</Label><Input type="date" value={form.arrival_date || ""} onChange={(e) => sf("arrival_date", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Total Unidades</Label><Input type="number" value={form.total_units || ""} onChange={(e) => snf("total_units", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => sf("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planeación</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="in_customs">En Aduana</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 border-t pt-3 mt-1"><p className="text-sm font-semibold mb-3">Costos de Importación</p></div>
            <div className="space-y-1.5"><Label>Aduana</Label><Input type="number" step="0.01" value={form.customs_total || ""} onChange={(e) => snf("customs_total", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Flete</Label><Input type="number" step="0.01" value={form.freight_total || ""} onChange={(e) => snf("freight_total", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Transporte Local</Label><Input type="number" step="0.01" value={form.local_transport_total || ""} onChange={(e) => snf("local_transport_total", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Costos Extra</Label><Input type="number" step="0.01" value={form.extra_cost_total || ""} onChange={(e) => snf("extra_cost_total", e.target.value)} /></div>
            <div className="col-span-2 p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Importación:</span>
                <span className="font-bold">{formatCurrency(totalImportCost(form))}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Costo/Unidad:</span>
                <span className="font-bold">{form.total_units > 0 ? formatCurrency(totalImportCost(form) / form.total_units) : "—"}</span>
              </div>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Textarea value={form.notes || ""} onChange={(e) => sf("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.batch_code || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}