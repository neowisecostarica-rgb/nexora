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
  const [brandFilter, setBrandFilter] = useState("all");
  const [editUnit, setEditUnit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const qc = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryUnits.list("-created_date", 500),
  });

  const { data: pricingProfiles = [] } = useQuery({
    queryKey: ["pricingProfiles"],
    queryFn: () => base44.entities.PricingProfiles.filter({ active: true }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryUnits.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setEditUnit(null); },
  });

  const brands = [...new Set(units.map((u) => u.brand).filter(Boolean))].sort();

  const filtered = units.filter((u) => {
    const matchSearch = !search || `${u.brand} ${u.model} ${u.cpu_raw} ${u.cpu_normalized} ${u.serial_code_internal}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    const matchBrand = brandFilter === "all" || u.brand === brandFilter;
    return matchSearch && matchStatus && matchBrand;
  });

  const openEdit = (u) => {
    setEditUnit(u);
    setEditForm({
      cost_repair_unit: u.cost_repair_unit || 0,
      cost_local_unit: u.cost_local_unit || 0,
      cost_import_unit: u.cost_import_unit || 0,
      condition_grade: u.condition_grade || "B",
      status: u.status || "available",
      cosmetic_notes: u.cosmetic_notes || "",
      technical_notes: u.technical_notes || "",
      battery_notes: u.battery_notes || "",
      charger_included: u.charger_included || false,
      warehouse_location: u.warehouse_location || "",
      pricing_profile_id: u.pricing_profile_id || "",
      images: u.images || [],
      main_image: u.main_image || null,
    });
  };

  const saveEdit = () => {
    if (!editUnit) return;
    const costPurchase = editUnit.cost_purchase_unit || 0;
    const totalCost = costPurchase + (editForm.cost_import_unit || 0) + (editForm.cost_repair_unit || 0) + (editForm.cost_local_unit || 0);
    updateMutation.mutate({
      id: editUnit.id,
      data: { ...editForm, total_real_unit_cost: totalCost },
    });
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
            <SelectItem value="quoted">Cotizado</SelectItem>
            <SelectItem value="sold">Vendido</SelectItem>
            <SelectItem value="warranty">Garantía</SelectItem>
            <SelectItem value="damaged">Dañado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
                <TableHead>Serie</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>RAM</TableHead>
                <TableHead>Disco</TableHead>
                <TableHead>Cond.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Costo Real</TableHead>
                <TableHead>Retail</TableHead>
                <TableHead>Mayoreo</TableHead>
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
                  <TableCell className="font-mono text-xs">{u.serial_code_internal || "—"}</TableCell>
                  <TableCell className="font-medium">{u.brand}</TableCell>
                  <TableCell>{u.model}</TableCell>
                  <TableCell className="text-sm">{u.cpu_normalized || u.cpu_raw || "—"}</TableCell>
                  <TableCell>{u.ram_gb}GB</TableCell>
                  <TableCell>{u.storage_gb}GB {u.storage_type}</TableCell>
                  <TableCell>{u.condition_grade || "—"}</TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="font-semibold">{formatCurrency(u.total_real_unit_cost)}</TableCell>
                  <TableCell>{formatCurrency(u.retail_price)}</TableCell>
                  <TableCell>{formatCurrency(u.wholesale_price)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
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
            <DialogTitle>Editar {editUnit?.brand} {editUnit?.model}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="quoted">Cotizado</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="warranty">Garantía</SelectItem>
                  <SelectItem value="damaged">Dañado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condición</Label>
              <Select value={editForm.condition_grade} onValueChange={(v) => setEditForm((f) => ({ ...f, condition_grade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem><SelectItem value="A">A</SelectItem>
                  <SelectItem value="B+">B+</SelectItem><SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Costo Importación</Label><Input type="number" step="0.01" value={editForm.cost_import_unit || ""} onChange={(e) => setEditForm((f) => ({ ...f, cost_import_unit: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Costo Reparación</Label><Input type="number" step="0.01" value={editForm.cost_repair_unit || ""} onChange={(e) => setEditForm((f) => ({ ...f, cost_repair_unit: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Costos Locales</Label><Input type="number" step="0.01" value={editForm.cost_local_unit || ""} onChange={(e) => setEditForm((f) => ({ ...f, cost_local_unit: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Ubicación</Label><Input value={editForm.warehouse_location || ""} onChange={(e) => setEditForm((f) => ({ ...f, warehouse_location: e.target.value }))} /></div>
            <div className="col-span-2 p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Compra:</span><span className="font-medium">{formatCurrency(editUnit?.cost_purchase_unit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Import:</span><span className="font-medium">{formatCurrency(editForm.cost_import_unit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Reparación:</span><span className="font-medium">{formatCurrency(editForm.cost_repair_unit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Locales:</span><span className="font-medium">{formatCurrency(editForm.cost_local_unit)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t mt-2 pt-2">
                <span>Costo Real Total:</span>
                <span>{formatCurrency((editUnit?.cost_purchase_unit || 0) + (editForm.cost_import_unit || 0) + (editForm.cost_repair_unit || 0) + (editForm.cost_local_unit || 0))}</span>
              </div>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Notas Cosméticas</Label><Textarea value={editForm.cosmetic_notes || ""} onChange={(e) => setEditForm((f) => ({ ...f, cosmetic_notes: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Notas Técnicas</Label><Textarea value={editForm.technical_notes || ""} onChange={(e) => setEditForm((f) => ({ ...f, technical_notes: e.target.value }))} /></div>

            <div className="col-span-2 space-y-1.5">
              <Label>Perfil de Precios</Label>
              <Select value={editForm.pricing_profile_id || ""} onValueChange={(v) => setEditForm((f) => ({ ...f, pricing_profile_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sin perfil (no vendible)" /></SelectTrigger>
                <SelectContent>
                  {pricingProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.sales_channel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editForm.pricing_profile_id && (
                <p className="text-xs text-yellow-600">⚠ Sin perfil de precios, esta unidad no aparecerá en el catálogo.</p>
              )}
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