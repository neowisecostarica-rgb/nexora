/**
 * Propósito: alta y edición de bodegas, casilleros y direcciones virtuales de recepción.
 * Datos: formulario local; la persistencia ocurre en el padre mediante tenantData.
 * Límites: no asigna inventario ni costos; solo conserva la dirección recordable.
 */
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = {
  name: "", code: "", warehouse_type: "warehouse", carrier: "", contact_name: "",
  phone: "", email: "", address_line1: "", address_line2: "", city: "", state: "",
  postal_code: "", country: "", locker_number: "", hours: "", notes: "",
  is_default: false, is_active: true,
};

export default function WarehouseDialog({ open, onOpenChange, initial, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar bodega o casillero" : "Nueva bodega o casillero"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => sf("name", e.target.value)} placeholder="Casillero Miami 01" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.warehouse_type} onValueChange={(v) => sf("warehouse_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="warehouse">Bodega física</SelectItem>
                <SelectItem value="locker">Casillero</SelectItem>
                <SelectItem value="virtual_address">Dirección virtual</SelectItem>
                <SelectItem value="consolidation">Centro de consolidación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input value={form.code} onChange={(e) => sf("code", e.target.value)} placeholder="MIA-01" />
          </div>
          <div className="space-y-1.5">
            <Label>Courier / transportista</Label>
            <Input value={form.carrier} onChange={(e) => sf("carrier", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Número de casillero</Label>
            <Input value={form.locker_number} onChange={(e) => sf("locker_number", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Dirección línea 1</Label>
            <Input value={form.address_line1} onChange={(e) => sf("address_line1", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Dirección línea 2</Label>
            <Input value={form.address_line2} onChange={(e) => sf("address_line2", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ciudad</Label>
            <Input value={form.city} onChange={(e) => sf("city", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado / provincia</Label>
            <Input value={form.state} onChange={(e) => sf("state", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Código postal</Label>
            <Input value={form.postal_code} onChange={(e) => sf("postal_code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>País</Label>
            <Input value={form.country} onChange={(e) => sf("country", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Contacto</Label>
            <Input value={form.contact_name} onChange={(e) => sf("contact_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => sf("phone", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => sf("email", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Horario de recepción</Label>
            <Input value={form.hours} onChange={(e) => sf("hours", e.target.value)} placeholder="Lun-Vie 9:00-17:00" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notas operativas</Label>
            <Textarea value={form.notes} onChange={(e) => sf("notes", e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Dirección por defecto</p>
              <p className="text-xs text-muted-foreground">Se sugiere al crear compras o envíos.</p>
            </div>
            <Switch checked={!!form.is_default} onCheckedChange={(v) => sf("is_default", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Activa</p>
              <p className="text-xs text-muted-foreground">Las inactivas se conservan como historial.</p>
            </div>
            <Switch checked={!!form.is_active} onCheckedChange={(v) => sf("is_active", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}