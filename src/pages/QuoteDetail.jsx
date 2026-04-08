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
import { ArrowLeft, Plus, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, generateCode } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";

export default function QuoteDetail() {
  const quoteId = window.location.pathname.split("/quotes/")[1];
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [customPrice, setCustomPrice] = useState(0);
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: quote } = useQuery({
    queryKey: ["quote", quoteId],
    queryFn: async () => { const list = await base44.entities.Quotes.filter({ id: quoteId }); return list[0]; },
    enabled: !!quoteId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["quoteItems", quoteId],
    queryFn: () => base44.entities.QuoteItems.filter({ quote_id: quoteId }),
    enabled: !!quoteId,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["availableInventory"],
    queryFn: () => base44.entities.InventoryUnits.filter({ status: "available" }),
  });

  const addItemMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.QuoteItems.create(data);
      const newItems = [...items, data];
      const subtotal = newItems.reduce((s, i) => s + (i.line_total || 0), 0);
      await base44.entities.Quotes.update(quoteId, { subtotal, total: subtotal });
      if (data.inventory_unit_id) {
        await base44.entities.InventoryUnits.update(data.inventory_unit_id, { status: "quoted" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quoteItems", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["availableInventory"] });
      setItemDialogOpen(false);
    },
  });

  const convertToSaleMutation = useMutation({
    mutationFn: async () => {
      const saleNumber = generateCode("VTA");
      const saleItems = [];
      let cogsTotal = 0;
      for (const item of items) {
        let unitCost = 0;
        if (item.inventory_unit_id) {
          const unitList = await base44.entities.InventoryUnits.filter({ id: item.inventory_unit_id });
          if (unitList[0]) {
            unitCost = unitList[0].total_real_unit_cost || 0;
            await base44.entities.InventoryUnits.update(item.inventory_unit_id, { status: "sold" });
          }
        }
        cogsTotal += unitCost * (item.quantity || 1);
        saleItems.push({
          inventory_unit_id: item.inventory_unit_id,
          description: item.description,
          quantity: item.quantity,
          unit_sale_price: item.unit_price,
          unit_cost: unitCost,
          unit_profit: item.unit_price - unitCost,
          line_total: item.line_total,
        });
      }
      const grossProfit = (quote?.total || 0) - cogsTotal;
      const marginPercent = cogsTotal > 0 ? (grossProfit / cogsTotal) * 100 : 0;
      const sale = await base44.entities.Sales.create({
        sale_number: saleNumber,
        customer_id: quote?.customer_id,
        customer_name: quote?.customer_name,
        quote_id: quoteId,
        sale_date: new Date().toISOString().split("T")[0],
        channel: quote?.sales_channel || "retail",
        subtotal: quote?.subtotal || 0,
        total: quote?.total || 0,
        cogs_total: cogsTotal,
        gross_profit_total: grossProfit,
        gross_margin_percent: marginPercent,
        status: "completed",
      });
      for (const si of saleItems) {
        await base44.entities.SaleItems.create({ ...si, sale_id: sale.id });
      }
      await base44.entities.Quotes.update(quoteId, { status: "approved" });
      toast({ title: "Venta creada", description: `Venta ${saleNumber} generada exitosamente.` });
      navigate("/sales");
    },
  });

  const handleAddItem = () => {
    const unit = inventory.find((u) => u.id === selectedUnit);
    if (!unit) return;
    const price = customPrice || (quote?.sales_channel === "wholesale" ? unit.wholesale_price : unit.retail_price) || 0;
    addItemMutation.mutate({
      quote_id: quoteId,
      inventory_unit_id: unit.id,
      description: `${unit.brand} ${unit.model} — ${unit.cpu || ""} ${unit.ram_gb}GB RAM ${unit.storage_gb}GB ${unit.storage_type}`,
      quantity: 1,
      unit_price: price,
      line_total: price,
    });
  };

  if (!quote) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div>
      <Link to="/quotes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />Volver a Cotizaciones
      </Link>

      <PageHeader title={`Cotización ${quote.quote_number}`} subtitle={`Cliente: ${quote.customer_name || "—"} · ${formatDate(quote.quote_date)}`}>
        <StatusBadge status={quote.status} />
        {quote.status === "draft" && items.length > 0 && (
          <Button onClick={() => convertToSaleMutation.mutate()} disabled={convertToSaleMutation.isPending}>
            <ShoppingCart className="w-4 h-4 mr-2" />{convertToSaleMutation.isPending ? "Procesando…" : "Convertir a Venta"}
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Subtotal</p><p className="text-xl font-bold">{formatCurrency(quote.subtotal)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Descuento</p><p className="text-xl font-bold">{formatCurrency(quote.discount_total)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Impuesto</p><p className="text-xl font-bold">{formatCurrency(quote.tax_total)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Total</p><p className="text-xl font-bold text-primary">{formatCurrency(quote.total)}</p></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Equipos Cotizados</CardTitle>
          {quote.status === "draft" && (
            <Button size="sm" onClick={() => setItemDialogOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" />Agregar Equipo</Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay equipos en esta cotización</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Equipo a Cotización</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Equipo Disponible</Label>
              <Select value={selectedUnit} onValueChange={(v) => { setSelectedUnit(v); setCustomPrice(0); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar equipo…" /></SelectTrigger>
                <SelectContent>
                  {inventory.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.brand} {u.model} — {u.ram_gb}GB/{u.storage_gb}GB — R: {formatCurrency(u.retail_price)} | M: {formatCurrency(u.wholesale_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Precio Personalizado (opcional)</Label>
              <Input type="number" step="0.01" value={customPrice || ""} onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)} placeholder="Dejar en 0 para usar precio del perfil" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={!selectedUnit || addItemMutation.isPending}>
              {addItemMutation.isPending ? "Agregando…" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}