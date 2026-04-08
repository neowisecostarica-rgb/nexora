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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Users } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

const TYPE_LABELS = { individual: "Individuo", business: "Empresa", reseller: "Revendedor" };

const EMPTY = { customer_type: "individual", full_name: "", company_name: "", tax_id: "", phone: "", email: "", address: "", city: "", notes: "", preferred_channel: "retail" };

export default function CustomersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customers.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.Customers.update(editing.id, data) : base44.entities.Customers.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setDialogOpen(false); setEditing(null); setForm(EMPTY); },
  });

  const openNew = () => { setForm(EMPTY); setEditing(null); setDialogOpen(true); };
  const openEdit = (c) => { setForm(c); setEditing(c); setDialogOpen(true); };
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = customers.filter((c) =>
    `${c.full_name} ${c.company_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Gestiona tu base de clientes">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Cliente</Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Users} title="Sin clientes" description="Agrega tu primer cliente" actionLabel="Nuevo Cliente" onAction={openNew} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(c)}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell>{c.company_name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="border-0 text-xs">{TYPE_LABELS[c.customer_type] || c.customer_type}</Badge></TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell className="capitalize">{c.preferred_channel || "—"}</TableCell>
                  <TableCell><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Nombre Completo *</Label><Input value={form.full_name} onChange={(e) => sf("full_name", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.customer_type} onValueChange={(v) => sf("customer_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individuo</SelectItem>
                  <SelectItem value="business">Empresa</SelectItem>
                  <SelectItem value="reseller">Revendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Empresa</Label><Input value={form.company_name || ""} onChange={(e) => sf("company_name", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>RFC / Tax ID</Label><Input value={form.tax_id || ""} onChange={(e) => sf("tax_id", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone || ""} onChange={(e) => sf("phone", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email || ""} onChange={(e) => sf("email", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Ciudad</Label><Input value={form.city || ""} onChange={(e) => sf("city", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Dirección</Label><Input value={form.address || ""} onChange={(e) => sf("address", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Canal Preferido</Label>
              <Select value={form.preferred_channel || "retail"} onValueChange={(v) => sf("preferred_channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Mayoreo</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Textarea value={form.notes || ""} onChange={(e) => sf("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.full_name || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}