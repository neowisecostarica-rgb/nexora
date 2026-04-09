import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";

const EMPTY_ITEM = {
  brand: "", model: "", cpu: "", ram_gb: 8, storage_type: "SSD", storage_gb: 256,
  form_factor: "clamshell", condition_grade: "B", quantity: 1, item_subtotal: 0, notes: "",
};

export default function PurchaseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const poId = window.location.pathname.split("/purchases/")[1];
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: order } = useQuery({
    queryKey: ["po", poId],
    queryFn: async () => {
      const list = await base44.entities.PurchaseOrders.filter({ id: poId });
      return list[0];
    },
    enabled: !!poId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["poItems", poId],
    queryFn: () => base44.entities.PurchaseItems.filter({ purchase_order_id: poId }),
    enabled: !!poId,
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseItems.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["poItems", poId] }); setItemDialogOpen(false); setItemForm(EMPTY_ITEM); },
  });

  const generateUnitsMutation = useMutation({
    mutationFn: async () => {
      if (!order) return;
      // Cada item se convierte via función backend (con lock, idempotencia y trazabilidad)
      const pendingItems = items.filter(item =>
        (item.inventory_generated_count || 0) < (item.quantity || 1)
      );
      if (pendingItems.length === 0) {
        toast({ title: "Sin pendientes", description: "Todos los items ya tienen sus unidades generadas." });
        return;
      }
      let totalCreated = 0;
      for (const item of pendingItems) {
        const result = await base44.functions.invoke("createInventoryFromPurchaseItem", {
          purchaseItemId: item.id,
          importBatchId: order.import_batch_id || null,
        });
        totalCreated += result.data?.created_count || 0;
      }
      await base44.entities.PurchaseOrders.update(poId, { status: "received" });
      toast({ title: "Inventario generado", description: `${totalCreated} unidades creadas con trazabilidad completa.` });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["po", poId] });
      qc.invalidateQueries({ queryKey: ["poItems", poId] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const setItemField = (k, v) => setItemForm((f) => ({ ...f, [k]: v }));

  if (!order) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;
  }

  const totalItemQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div>
      <Link to="/purchases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />Volver a Compras
      </Link>

      <PageHeader title={`Orden ${order.purchase_code || order.order_number}`} subtitle={`Fecha: ${formatDate(order.purchase_date)}`}>
        <StatusBadge status={order.status} />
        {items.length > 0 && items.some(i => (i.inventory_generated_count || 0) < (i.quantity || 1)) && (
          <Button onClick={() => generateUnitsMutation.mutate()} disabled={generateUnitsMutation.isPending}>
            <Package className="w-4 h-4 mr-2" />{generateUnitsMutation.isPending ? "Generando…" : "Generar Inventario"}
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Pagado</p>
          <p className="text-xl font-bold">{formatCurrency(order.order_total_paid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Unidades</p>
          <p className="text-xl font-bold">{order.total_units}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Costo/Unidad</p>
          <p className="text-xl font-bold">{order.total_units > 0 ? formatCurrency(order.order_total_paid / order.total_units) : "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Plataforma</p>
          <p className="text-xl font-bold capitalize">{order.source_platform || "—"}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Items de la Orden</CardTitle>
          <Button size="sm" onClick={() => { setItemForm({ ...EMPTY_ITEM, purchase_order_id: poId }); setItemDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" />Agregar Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay items registrados en esta orden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>RAM</TableHead>
                  <TableHead>SSD</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Costo Asig.</TableHead>
                  <TableHead>Inventariado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const allocatedCost = order.order_total_paid ? (order.order_total_paid * (item.quantity || 1)) / (totalItemQty || 1) : item.item_subtotal;
                  const generated = item.inventory_generated_count || 0;
                  const total = item.quantity || 1;
                  const fullyConverted = generated >= total;
                  const inProgress = item.conversion_in_progress;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.brand}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="text-sm">{item.cpu || "—"}</TableCell>
                      <TableCell>{item.ram_gb}GB</TableCell>
                      <TableCell>{item.storage_gb}GB {item.storage_type}</TableCell>
                      <TableCell>{item.condition_grade}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(allocatedCost)}</TableCell>
                      <TableCell>
                        {inProgress ? (
                          <span className="text-xs text-yellow-600 font-medium">En proceso…</span>
                        ) : fullyConverted ? (
                          <span className="text-xs text-green-600 font-medium">{generated}/{total} ✓</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{generated}/{total}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Agregar Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Marca *</Label><Input value={itemForm.brand} onChange={(e) => setItemField("brand", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Modelo *</Label><Input value={itemForm.model} onChange={(e) => setItemField("model", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>CPU</Label><Input value={itemForm.cpu} onChange={(e) => setItemField("cpu", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>RAM (GB)</Label><Input type="number" value={itemForm.ram_gb || ""} onChange={(e) => setItemField("ram_gb", parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-1.5">
              <Label>Almacenamiento</Label>
              <Select value={itemForm.storage_type} onValueChange={(v) => setItemField("storage_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSD">SSD</SelectItem><SelectItem value="HDD">HDD</SelectItem>
                  <SelectItem value="NVMe">NVMe</SelectItem><SelectItem value="eMMC">eMMC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Capacidad (GB)</Label><Input type="number" value={itemForm.storage_gb || ""} onChange={(e) => setItemField("storage_gb", parseInt(e.target.value) || 0)} /></div>
            <div className="space-y-1.5">
              <Label>Condición</Label>
              <Select value={itemForm.condition_grade} onValueChange={(v) => setItemField("condition_grade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem><SelectItem value="A">A</SelectItem>
                  <SelectItem value="B+">B+</SelectItem><SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                  <SelectItem value="parts">Partes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Cantidad *</Label><Input type="number" value={itemForm.quantity || ""} onChange={(e) => setItemField("quantity", parseInt(e.target.value) || 1)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createItemMutation.mutate({ ...itemForm, purchase_order_id: poId })} disabled={!itemForm.brand || !itemForm.model || createItemMutation.isPending}>
              {createItemMutation.isPending ? "Guardando…" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}