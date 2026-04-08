import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

const SOURCE_LABELS = { ebay: "eBay", local_supplier: "Local", distributor: "Distribuidor", other: "Otro" };

const EMPTY_SUPPLIER = {
  name: "", source_type: "local_supplier", contact_name: "", phone: "", email: "", country: "", notes: "", is_active: true,
};

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Suppliers.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing ? base44.entities.Suppliers.update(editing.id, data) : base44.entities.Suppliers.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); closeDialog(); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY_SUPPLIER); };
  const openNew = () => { setForm(EMPTY_SUPPLIER); setEditing(null); setDialogOpen(true); };
  const openEdit = (s) => { setForm(s); setEditing(s); setDialogOpen(true); };

  const filtered = suppliers.filter(
    (s) => s.name?.toLowerCase().includes(search.toLowerCase()) || s.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Proveedores" subtitle="Gestiona tus proveedores de equipos">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Proveedor</Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar proveedor…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState title="Sin proveedores" description="Agrega tu primer proveedor para comenzar" actionLabel="Nuevo Proveedor" onAction={openNew} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(s)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{SOURCE_LABELS[s.source_type] || s.source_type}</TableCell>
                  <TableCell>{s.contact_name || "—"}</TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell>{s.country || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={s.is_active !== false ? "bg-green-500/10 text-green-500 border-0" : "bg-gray-500/10 text-gray-500 border-0"}>
                      {s.is_active !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de fuente *</Label>
              <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="local_supplier">Local</SelectItem>
                  <SelectItem value="distributor">Distribuidor</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contacto</Label>
              <Input value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={form.is_active !== false} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Activo</Label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}