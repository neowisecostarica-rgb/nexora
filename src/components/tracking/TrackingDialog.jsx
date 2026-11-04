/**
 * Propósito: alta y edición de guías de seguimiento vinculadas a una operación.
 * Datos: formulario local; persistencia en el padre vía tenantData.
 * Límites: no consulta couriers automáticamente; los eventos se registran manualmente.
 */
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const TRACKING_STATUS = [
  { value: "label_created", label: "Guía creada" },
  { value: "in_transit", label: "En tránsito" },
  { value: "customs", label: "En aduana" },
  { value: "out_for_delivery", label: "En reparto" },
  { value: "delivered", label: "Entregado" },
  { value: "exception", label: "Incidencia" },
  { value: "returned", label: "Devuelto" },
];

const EMPTY = {
  tracking_number: "", courier: "", status: "label_created", linked_entity_type: "",
  linked_entity_id: "", warehouse_id: "", origin: "", expected_date: "", notes: "", is_active: true,
};

export default function TrackingDialog({ open, onOpenChange, initial, batches = [], purchases = [], warehouses = [], onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => {
    if (open) setForm({ ...EMPTY, ...(initial || {}) });
  }, [open, initial]);

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const linkOptions = form.linked_entity_type === "ImportBatches"
    ? batches.map((b) => ({ id: b.id, label: b.batch_code || b.id }))
    : form.linked_entity_type === "PurchaseOrders"
      ? purchases.map((p) => ({ id: p.id, label: p.order_number || p.id }))
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar seguimiento" : "Nueva guía de seguimiento"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Número de guía *</Label>
            <Input value={form.tracking_number} onChange={(e) => sf("tracking_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Courier</Label>
            <Input value={form.courier} onChange={(e) => sf("courier", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => sf("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRACKING_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha estimada</Label>
            <Input type="date" value={form.expected_date || ""} onChange={(e) => sf("expected_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Operación vinculada</Label>
            <Select
              value={form.linked_entity_type || "none"}
              onValueChange={(v) => setForm((f) => ({ ...f, linked_entity_type: v === "none" ? "" : v, linked_entity_id: "" }))}
            >
              <SelectTrigger><SelectValue placeholder="Sin vínculo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin vínculo</SelectItem>
                <SelectItem value="ImportBatches">Lote de importación</SelectItem>
                <SelectItem value="PurchaseOrders">Orden de compra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Referencia</Label>
            <Select
              value={form.linked_entity_id || "none"}
              onValueChange={(v) => sf("linked_entity_id", v === "none" ? "" : v)}
              disabled={!form.linked_entity_type}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin referencia</SelectItem>
                {linkOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bodega / casillero destino</Label>
            <Select value={form.warehouse_id || "none"} onValueChange={(v) => sf("warehouse_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Origen</Label>
            <Input value={form.origin} onChange={(e) => sf("origin", e.target.value)} placeholder="Miami, USA" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => sf("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.tracking_number || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}