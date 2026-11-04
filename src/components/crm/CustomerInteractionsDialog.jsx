/**
 * Propósito: historial de contactos comerciales de un cliente o prospecto.
 * Datos: lee CustomerInteractions por customer_id; crea un evento y actualiza fechas del cliente/perfil.
 * Límites: no envía mensajes reales; registra lo conversado. No altera ventas ni precios.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";

export const CHANNEL_LABELS = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Reunión",
  note: "Nota",
};

const EMPTY = {
  channel: "whatsapp", summary: "", outcome: "needs_follow_up",
  occurred_at: new Date().toISOString().slice(0, 16), next_follow_up_date: "",
};

export default function CustomerInteractionsDialog({ customer, profile, open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["customerInteractions", customer?.id],
    queryFn: () => base44.entities.CustomerInteractions.filter({ customer_id: customer.id }, "-occurred_at", 100),
    enabled: !!customer?.id && open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const occurred_at = form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString();
      await base44.entities.CustomerInteractions.create({
        customer_id: customer.id,
        channel: form.channel,
        summary: form.summary,
        outcome: form.outcome,
        occurred_at,
        next_follow_up_date: form.next_follow_up_date || null,
        author_name: user?.full_name || "",
      });
      const contactDate = occurred_at.slice(0, 10);
      await base44.entities.Customers.update(customer.id, { last_contact_date: contactDate });
      if (form.next_follow_up_date && profile?.id) {
        await base44.entities.CustomerProfiles.update(profile.id, { next_follow_up_date: form.next_follow_up_date });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customerInteractions", customer?.id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customerProfiles"] });
      setForm({ ...EMPTY, occurred_at: new Date().toISOString().slice(0, 16) });
    },
  });

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento · {customer?.full_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando historial…</p>
            ) : interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin contactos registrados.</p>
            ) : interactions.map((it) => (
              <div key={it.id} className="text-sm border-l-2 border-primary/30 pl-3">
                <p className="font-medium">{CHANNEL_LABELS[it.channel] || it.channel} · {new Date(it.occurred_at).toLocaleString("es-MX")}</p>
                <p className="text-muted-foreground">{it.summary}</p>
                {it.next_follow_up_date && <p className="text-xs text-muted-foreground">Próximo: {it.next_follow_up_date}</p>}
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-semibold">Registrar contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={(v) => sf("channel", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={form.occurred_at} onChange={(e) => sf("occurred_at", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Resumen *</Label>
                <Textarea value={form.summary} onChange={(e) => sf("summary", e.target.value)} placeholder="Pidió cotización de 10 laptops…" />
              </div>
              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Select value={form.outcome} onValueChange={(v) => sf("outcome", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_response">Sin respuesta</SelectItem>
                    <SelectItem value="interested">Interesado</SelectItem>
                    <SelectItem value="needs_follow_up">Requiere seguimiento</SelectItem>
                    <SelectItem value="won">Cerrado</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                    <SelectItem value="info">Solo información</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Próximo seguimiento</Label>
                <Input type="date" value={form.next_follow_up_date} onChange={(e) => sf("next_follow_up_date", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.summary || saveMutation.isPending}>
            {saveMutation.isPending ? "Guardando…" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}