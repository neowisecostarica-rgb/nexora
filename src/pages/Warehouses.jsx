/**
 * Propósito: directorio recordable de bodegas, casilleros y direcciones virtuales por empresa.
 * Datos: lee/escribe Warehouses vía gateway (tenantData); no toca inventario ni costos.
 * Límites: no obtiene direcciones de couriers ni valida entregas reales.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Pencil, Copy, Warehouse, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import WarehouseDialog from "@/components/warehouses/WarehouseDialog";
import { useToast } from "@/components/ui/use-toast";

const TYPE_LABELS = {
  warehouse: { label: "Bodega", className: "bg-blue-500/10 text-blue-600" },
  locker: { label: "Casillero", className: "bg-purple-500/10 text-purple-600" },
  virtual_address: { label: "Dirección virtual", className: "bg-emerald-500/10 text-emerald-600" },
  consolidation: { label: "Consolidación", className: "bg-amber-500/10 text-amber-600" },
};

const addressText = (w) => [
  w.name,
  w.locker_number ? `Casillero: ${w.locker_number}` : null,
  w.address_line1,
  w.address_line2,
  [w.city, w.state, w.postal_code].filter(Boolean).join(", "),
  w.country,
  w.phone ? `Tel: ${w.phone}` : null,
].filter(Boolean).join("\n");

export default function Warehouses() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouses.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.Warehouses.update(editing.id, data)
      : base44.entities.Warehouses.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (w) => { setEditing(w); setDialogOpen(true); };

  const copyAddress = async (w) => {
    try {
      await navigator.clipboard.writeText(addressText(w));
      toast({ title: "Dirección copiada", description: w.name });
    } catch {
      toast({ title: "No se pudo copiar", description: "Copiá la dirección manualmente.", variant: "destructive" });
    }
  };

  const filtered = warehouses.filter((w) => {
    const text = `${w.name} ${w.code} ${w.city} ${w.country} ${w.carrier} ${w.locker_number}`.toLowerCase();
    return (showInactive || w.is_active !== false) && (!search || text.includes(search.toLowerCase()));
  });

  return (
    <div>
      <PageHeader title="Bodegas y Casilleros" subtitle={`${filtered.length} direcciones guardadas`}>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nueva dirección</Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar bodega, ciudad o courier…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          Mostrar inactivas
        </label>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Warehouse}
          title="Sin direcciones registradas"
          description="Guardá aquí las direcciones de bodegas, casilleros o recepción para reutilizarlas en compras e importaciones."
          actionLabel="Nueva dirección"
          onAction={openNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((w) => {
            const type = TYPE_LABELS[w.warehouse_type] || TYPE_LABELS.warehouse;
            return (
              <Card key={w.id} className="p-0 overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold leading-tight">{w.name}</h3>
                        {w.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {w.code || "Sin código"}{w.carrier ? ` · ${w.carrier}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`border-0 text-xs ${type.className}`}>{type.label}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {w.address_line1 && <p>{w.address_line1}</p>}
                    {w.address_line2 && <p>{w.address_line2}</p>}
                    <p>{[w.city, w.state, w.postal_code].filter(Boolean).join(", ") || "Sin ciudad registrada"}</p>
                    <p>{w.country || "—"}</p>
                    {w.locker_number && <p>Casillero: <span className="font-medium text-foreground">{w.locker_number}</span></p>}
                    {w.phone && <p>Tel: {w.phone}</p>}
                    {w.hours && <p>Horario: {w.hours}</p>}
                  </div>

                  {!w.is_active && <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 border-0 text-xs">Inactiva</Badge>}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => copyAddress(w)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />Copiar dirección
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        initial={editing}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}