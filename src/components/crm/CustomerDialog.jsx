/**
 * Propósito: alta y edición de clientes/prospectos con su etapa comercial.
 * Datos: formulario local; el padre persiste Customer y CustomerProfiles.
 * Límites: no crea usuarios ni membresías; no modifica ventas históricas.
 */
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY_CUSTOMER = {
  customer_type: "individual", full_name: "", company_name: "", tax_id: "", phone: "",
  email: "", address: "", city: "", notes: "", preferred_channel: "retail",
};
const EMPTY_PROFILE = { lifecycle_status: "prospect", source: "", next_follow_up_date: "", priority: "normal" };

export const LIFECYCLE_LABELS = {
  prospect: "Prospecto",
  active: "Cliente activo",
  inactive: "Inactivo",
  blocked: "Bloqueado",
};

export default function CustomerDialog({ open, onOpenChange, initial, initialProfile, onSave, saving }) {
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  useEffect(() => {
    if (!open) return;
    setCustomer(initial ? { ...EMPTY_CUSTOMER, ...initial } : EMPTY_CUSTOMER);
    setProfile(initialProfile ? { ...EMPTY_PROFILE, ...initialProfile } : (initial ? { ...EMPTY_PROFILE, lifecycle_status: "active" } : EMPTY_PROFILE));
  }, [open, initial, initialProfile]);

  const sc = (k, v) => setCustomer((f) => ({ ...f, [k]: v }));
  const sp = (k, v) => setProfile((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar cliente" : "Nuevo cliente o prospecto"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Nombre completo *</Label>
            <Input value={customer.full_name} onChange={(e) => sc("full_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={customer.customer_type} onValueChange={(v) => sc("customer_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individuo</SelectItem>
                <SelectItem value="business">Empresa</SelectItem>
                <SelectItem value="reseller">Revendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Etapa comercial</Label>
            <Select value={profile.lifecycle_status} onValueChange={(v) => sp("lifecycle_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospecto</SelectItem>
                <SelectItem value="active">Cliente activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Empresa</Label><Input value={customer.company_name || ""} onChange={(e) => sc("company_name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>RFC / Tax ID</Label><Input value={customer.tax_id || ""} onChange={(e) => sc("tax_id", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Teléfono</Label><Input value={customer.phone || ""} onChange={(e) => sc("phone", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={customer.email || ""} onChange={(e) => sc("email", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Ciudad</Label><Input value={customer.city || ""} onChange={(e) => sc("city", e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Canal preferido</Label>
            <Select value={customer.preferred_channel || "retail"} onValueChange={(v) => sc("preferred_channel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Mayoreo</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5"><Label>Dirección</Label><Input value={customer.address || ""} onChange={(e) => sc("address", e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Origen del contacto</Label>
            <Input value={profile.source || ""} onChange={(e) => sp("source", e.target.value)} placeholder="Referido, marketplace, feria…" />
          </div>
          <div className="space-y-1.5">
            <Label>Próximo seguimiento</Label>
            <Input type="date" value={profile.next_follow_up_date || ""} onChange={(e) => sp("next_follow_up_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <Select value={profile.priority || "normal"} onValueChange={(v) => sp("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Textarea value={customer.notes || ""} onChange={(e) => sc("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(customer, profile)} disabled={!customer.full_name || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}