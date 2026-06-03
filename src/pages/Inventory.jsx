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
import { Search, Monitor, Pencil, Image } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/formatters";
import ImageManager from "@/components/inventory/ImageManager";

const PLACEHOLDER = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editUnit, setEditUnit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const qc = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryUnits.list("-created_date", 500),
  });

  const { data: pricingProfiles = [] } = useQuery({
    queryKey: ["pricingProfiles"],
    queryFn: () => base44.entities.PricingProfiles.filter({ is_active: true }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryUnits.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setEditUnit(null); },
  });

  const categories = [...new Set(units.map((u) => u.category_key).filter(Boolean))].sort();

  const filtered = units.filter((u) => {
    const attrs = u.attributes || {};
    const searchable = `${u.normalized_display_name || ""} ${attrs.brand || ""} ${attrs.model || ""} ${u.category_key || ""}`.toLowerCase();
    const matchSearch = !search || searchable.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    const matchCategory = categoryFilter === "all" || u.category_key === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const openEdit = (u) => {
    setEditUnit(u);
    setEditForm({
      assigned_pricing_profile_id: u.assigned_pricing_profile_id || "",
      condition: u.condition || "",
      location: u.location || "",
      status: u.status || "available",
      images: u.images || [],
      main_image: u.main_image || null,
    });
  };

  const saveEdit = () => {
    if (!editUnit) return;
    updateMutation.mutate({ id: editUnit.id, data: editForm });
  };

  return (
    <div>
      <PageHeader title="Inventario" subtitle={`${filtered.length} unidades`} />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponible</SelectItem>
            <SelectItem value="reserved">Reservado</SelectItem>
            <SelectItem value="sold">Vendido</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Monitor} title="Sin unidades" description="Las unidades se generan automáticamente desde las órdenes de compra" />
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Costo Real</TableHead>
                <TableHead>Retail</TableHead>
                <TableHead>Mayoreo</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/50">
                  <TableCell>
                    <img
                      src={u.main_image || (u.images && u.images[0]) || PLACEHOLDER}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                      onError={e => { e.target.src = PLACEHOLDER; }}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {u.normalized_display_name || u.category_key || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.category_key || "—"}</TableCell>
                  <TableCell>{u.condition || "—"}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="font-semibold">{formatCurrency(u.total_real_unit_cost)}</TableCell>
                  <TableCell>{formatCurrency(u.retail_price)}</TableCell>
                  <TableCell>{formatCurrency(u.wholesale_price)}</TableCell>
                  <TableCell>{formatCurrency(u.minimum_price)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editUnit} onOpenChange={(o) => { if (!o) setEditUnit(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar {editUnit?.normalized_display_name || editUnit?.category_key}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Condición</Label>
              <Select value={editForm.condition || ""} onValueChange={(v) => setEditForm((f) => ({ ...f, condition: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {["A+","A","B+","B","C","D","parts"].map(c => (
                    <SelectItem key={c} value={c}>Grado {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Costo Real (SOT)</Label>
              <Input
                type="number"
                value={editUnit?.total_real_unit_cost ?? 0}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Calculado automáticamente por el motor de costos. Solo lectura.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Ubicación</Label>
              <Input
                value={editForm.location || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            {/* PRECIOS: Solo lectura — calculados por PricingEngine */}
            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-2">
                <span>🔒</span> Precios calculados automáticamente (solo lectura)
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Retail</p>
                  <p className="font-semibold">{formatCurrency(editUnit?.retail_price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mayoreo</p>
                  <p className="font-semibold text-primary">{formatCurrency(editUnit?.wholesale_price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mínimo</p>
                  <p className="font-semibold">{formatCurrency(editUnit?.minimum_price)}</p>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Perfil de Precios (override)</Label>
              <Select
                value={editForm.assigned_pricing_profile_id || ""}
                onValueChange={(v) => setEditForm((f) => ({ ...f, assigned_pricing_profile_id: v || null }))}
              >
                <SelectTrigger><SelectValue placeholder="Sin override (usa perfil por categoría/global)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin override</SelectItem>
                  {pricingProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Imágenes</Label>
              <ImageManager
                images={editForm.images || []}
                mainImage={editForm.main_image}
                onChange={(v) => setEditForm((f) => ({ ...f, ...v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUnit(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}