/**
 * Propósito: historial de eventos de una guía de seguimiento y registro manual de avances.
 * Datos: lee tracking.events; escribe un nuevo evento mediante el callback del padre.
 * Límites: no llama APIs de courier; el estado resumido lo actualiza el padre.
 */
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRACKING_STATUS } from "./TrackingDialog";

const nowLocal = () => new Date().toISOString().slice(0, 16);

export default function TrackingHistoryDialog({ tracking, open, onClose, onAdd, saving }) {
  const [form, setForm] = useState({ status: "in_transit", description: "", location: "", occurred_at: nowLocal() });
  useEffect(() => {
    if (open) setForm({ status: tracking?.status || "in_transit", description: "", location: "", occurred_at: nowLocal() });
  }, [open, tracking?.id]);

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const events = [...(tracking?.events || [])].sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento {tracking?.tracking_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {tracking?.courier || "Sin courier"} · {TRACKING_STATUS.find((s) => s.value === tracking?.status)?.label || tracking?.status}
          </p>

          <div className="rounded-lg border p-3 space-y-2 max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
            ) : events.map((ev, i) => (
              <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                <p className="font-medium">{TRACKING_STATUS.find((s) => s.value === ev.status)?.label || ev.status}</p>
                {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {ev.occurred_at ? new Date(ev.occurred_at).toLocaleString("es-MX") : "—"}
                  {ev.location ? ` · ${ev.location}` : ""}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-semibold">Registrar avance</p>
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={form.occurred_at} onChange={(e) => sf("occurred_at", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={(e) => sf("description", e.target.value)} placeholder="Llegó a bodega de consolidación" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Ubicación</Label>
                <Input value={form.location} onChange={(e) => sf("location", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button
            onClick={() => onAdd({
              status: form.status,
              description: form.description,
              location: form.location,
              occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
            })}
            disabled={saving || !form.description}
          >
            {saving ? "Guardando…" : "Agregar evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}