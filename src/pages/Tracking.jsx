/**
 * Propósito: seguimiento manual de guías de courier vinculadas a lotes de importación u órdenes.
 * Datos: ShipmentTrackings, ImportBatches, PurchaseOrders, Warehouses vía gateway.
 * Límites: no consulta APIs de couriers automáticamente; el estado se actualiza con eventos manuales.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, History, MapPin } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import TrackingDialog, { TRACKING_STATUS } from "@/components/tracking/TrackingDialog";
import TrackingHistoryDialog from "@/components/tracking/TrackingHistoryDialog";
import { formatDate } from "@/lib/formatters";

export default function Tracking() {
  const batchId = new URLSearchParams(window.location.search).get("batch") || "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const qc = useQueryClient();

  const { data: trackings = [], isLoading } = useQuery({
    queryKey: ["shipmentTrackings"],
    queryFn: () => base44.entities.ShipmentTrackings.list("-updated_date", 200),
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["importBatches"],
    queryFn: () => base44.entities.ImportBatches.list("-created_date", 200),
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.PurchaseOrders.list("-created_date", 200),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouses.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? base44.entities.ShipmentTrackings.update(editing.id, data)
      : base44.entities.ShipmentTrackings.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipmentTrackings"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const eventMutation = useMutation({
    mutationFn: async (event) => {
      const events = [...(historyFor.events || []), event];
      return base44.entities.ShipmentTrackings.update(historyFor.id, {
        events,
        status: event.status,
        last_event: event.description,
        last_checked_at: event.occurred_at,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipmentTrackings"] });
      setHistoryFor(null);
    },
  });

  const openNew = () => {
    setEditing(batchId ? { linked_entity_type: "ImportBatches", linked_entity_id: batchId } : null);
    setDialogOpen(true);
  };
  const openEdit = (t) => { setEditing(t); setDialogOpen(true); };

  const labelFor = (t) => {
    if (t.linked_entity_type === "ImportBatches") {
      const b = batches.find((x) => x.id === t.linked_entity_id);
      return b ? `Lote ${b.batch_code}` : "Lote";
    }
    if (t.linked_entity_type === "PurchaseOrders") {
      const p = purchases.find((x) => x.id === t.linked_entity_id);
      return p ? `Orden ${p.order_number}` : "Orden";
    }
    if (t.linked_entity_type === "InventoryUnits") return "Unidad";
    return "—";
  };

  const filtered = trackings.filter((t) => {
    const wh = warehouses.find((w) => w.id === t.warehouse_id);
    const text = `${t.tracking_number} ${t.courier} ${t.last_event} ${wh?.name || ""} ${labelFor(t)}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) &&
      (statusFilter === "all" || t.status === statusFilter);
  });

  const activeCount = trackings.filter((t) => !["delivered", "returned"].includes(t.status)).length;

  return (
    <div>
      <PageHeader title="Seguimiento de Envíos" subtitle={`${activeCount} envíos activos · ${trackings.length} guías registradas`}>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nueva guía</Button>
      </PageHeader>

      {batchId && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Creando seguimiento para el lote seleccionado.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar guía, courier o destino…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {TRACKING_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={MapPin}
          title="Sin guías de seguimiento"
          description="Registrá números de guía para dar seguimiento a tus importaciones y compras."
          actionLabel="Nueva guía"
          onAction={openNew}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guía</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Último evento</TableHead>
                <TableHead>Estimado</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const wh = warehouses.find((w) => w.id === t.warehouse_id);
                return (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">{t.tracking_number}</TableCell>
                    <TableCell>{t.courier || "—"}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-sm">{labelFor(t)}</TableCell>
                    <TableCell className="text-sm">{wh?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{t.last_event || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(t.expected_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Historial" onClick={() => setHistoryFor(t)}>
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TrackingDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        initial={editing}
        batches={batches}
        purchases={purchases}
        warehouses={warehouses}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />

      <TrackingHistoryDialog
        tracking={historyFor}
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        onAdd={(event) => eventMutation.mutate(event)}
        saving={eventMutation.isPending}
      />
    </div>
  );
}