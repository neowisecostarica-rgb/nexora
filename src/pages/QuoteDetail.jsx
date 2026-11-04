/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Partidas de cotización, impresión y conversión directa en venta desde UI. Este camino también debe protegerse.
 * Datos/efectos detectados: InventoryUnits.filter, InventoryUnits.update, OrganizationProfile.filter, QuoteItems.create, QuoteItems.filter, Quotes.filter, Quotes.update, SaleItems.create, Sales.create
 * Dependencias: generateDocumentNumber
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ShoppingCart, Printer, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildOrgSnapshot } from "@/lib/orgProfileSnapshot";
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
    queryFn: async () => {
      const list = await base44.entities.Quotes.filter({ id: quoteId });
      return list[0];
    },
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

  const { data: orgProfiles = [] } = useQuery({
    queryKey: ["orgProfile"],
    queryFn: () => base44.entities.OrganizationProfile.filter({ active: true }),
  });

  const orgProfile = orgProfiles[0] || null;

  // El snapshot a usar: el de la cotización (histórico) o el activo si es nueva
  const snapshot = quote?.organization_profile_snapshot || (orgProfile ? buildOrgSnapshot(orgProfile) : null);

  const addItemMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.QuoteItems.create(data);
      const newItems = [...items, data];
      const subtotal = newItems.reduce((s, i) => s + (i.line_total || 0), 0);
      await base44.entities.Quotes.update(quoteId, { subtotal, total: subtotal });
      // No se cambia el estado de la unidad aquí: "quoted" no existe en el enum de InventoryUnits
      // y una cotización no reserva stock. La unidad se marca vendida solo al convertir en venta.
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quoteItems", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["availableInventory"] });
      setItemDialogOpen(false);
    },
  });

  // La conversión vive en servidor (convertQuoteToSale): congela costo SOT, evita doble venta
  // por cotización y no deja que el navegador escriba finanzas directamente.
  const convertToSaleMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("convertQuoteToSale", { quoteId });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["availableInventory"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast({
        title: data.code === "ALREADY_CONVERTED" ? "Venta ya existente" : "Venta creada",
        description: `Venta ${data.sale_number || data.sale_id} registrada con costo congelado.`,
      });
      navigate("/sales");
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "No se pudo convertir", description: error.message });
    },
  });

  const handleAddItem = () => {
    const unit = inventory.find((u) => u.id === selectedUnit);
    if (!unit) return;
    // Precio según canal: mayoreo por defecto
    const price = customPrice || (quote?.sales_channel === "wholesale" ? unit.wholesale_price : unit.retail_price) || 0;
    addItemMutation.mutate({
      quote_id: quoteId,
      inventory_unit_id: unit.id,
      description: `${unit.brand} ${unit.model}${unit.cpu_normalized ? ` · ${unit.cpu_normalized}` : ""} · ${unit.ram_gb}GB RAM · ${unit.storage_gb}GB ${unit.storage_type} · Cond. ${unit.condition_grade || "—"}`,
      quantity: 1,
      unit_price: price,
      line_total: price,
    });
  };

  if (!quote) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <Link to="/quotes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />Volver a Cotizaciones
      </Link>

      <PageHeader
        title={`Cotización ${quote.quote_number}`}
        subtitle={`Cliente: ${quote.customer_name || "—"} · ${formatDate(quote.quote_date)} · Válida: ${formatDate(quote.valid_until)}`}
      >
        <StatusBadge status={quote.status} />
        {quote.status === "draft" && items.length > 0 && (
          <Button onClick={() => convertToSaleMutation.mutate()} disabled={convertToSaleMutation.isPending}>
            <ShoppingCart className="w-4 h-4 mr-2" />{convertToSaleMutation.isPending ? "Procesando…" : "Convertir a Venta"}
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />Imprimir
        </Button>
      </PageHeader>

      {/* Cabecera del documento comercial */}
      {snapshot && (
        <Card className="mb-6 bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-start gap-4">
                {snapshot.logo_url && orgProfile?.show_logo_on_documents && (
                  <img src={snapshot.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                )}
                <div>
                  <p className="font-bold text-base">{snapshot.commercial_name}</p>
                  <p className="text-xs text-muted-foreground">{snapshot.legal_name}</p>
                  <p className="text-xs text-muted-foreground">{snapshot.email_main} · {snapshot.phone_main}</p>
                  {snapshot.address_line && <p className="text-xs text-muted-foreground">{snapshot.address_line}, {snapshot.city}</p>}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-1">
                <p className="font-mono font-bold text-base text-foreground">{quote.quote_number}</p>
                <p>Fecha: {formatDate(quote.quote_date)}</p>
                <p>Válida hasta: {formatDate(quote.valid_until)}</p>
                <Badge variant="outline" className="capitalize">{quote.sales_channel === "wholesale" ? "Mayoreo" : quote.sales_channel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Cant.</TableHead>
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

      {/* Notas y términos del snapshot */}
      {(quote.notes || (snapshot?.bank_details && orgProfile?.show_bank_details_on_quotes)) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {quote.notes && (
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Notas</p>
              <p className="text-sm whitespace-pre-line">{quote.notes}</p>
            </Card>
          )}
          {snapshot?.bank_details && orgProfile?.show_bank_details_on_quotes && (
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Información de Pago</p>
              <p className="text-sm whitespace-pre-line">{snapshot.payment_instructions}</p>
              {snapshot.bank_details && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{snapshot.bank_details}</p>}
              {snapshot.sinpe_details && <p className="text-xs text-muted-foreground mt-1">SINPE: {snapshot.sinpe_details}</p>}
            </Card>
          )}
        </div>
      )}
      {quote.terms_conditions_snapshot && orgProfile?.show_terms_on_quotes && (
        <Card className="mt-4 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Términos y Condiciones</p>
          <p className="text-xs text-muted-foreground whitespace-pre-line">{quote.terms_conditions_snapshot}</p>
        </Card>
      )}

      {/* Precios solo lectura — bloqueo visual */}
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
                      {u.brand} {u.model} · {u.condition_grade} · M: {formatCurrency(u.wholesale_price)} | R: {formatCurrency(u.retail_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUnit && (() => {
              const unit = inventory.find(u => u.id === selectedUnit);
              if (!unit) return null;
              const autoPrice = quote.sales_channel === "wholesale" ? unit.wholesale_price : unit.retail_price;
              return (
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Precio {quote.sales_channel === "wholesale" ? "Mayoreo" : "Retail"}:</span><span className="font-semibold">{formatCurrency(autoPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Precio Mínimo:</span><span>{formatCurrency(unit.minimum_sale_price)}</span></div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="w-3 h-3" />Precios calculados automáticamente por el motor de pricing</div>
                </div>
              );
            })()}
            <div className="space-y-1.5">
              <Label>Precio Personalizado <span className="text-muted-foreground text-xs">(opcional — dejar en 0 para usar precio del perfil)</span></Label>
              <Input type="number" step="0.01" value={customPrice || ""} onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)} placeholder="0.00" />
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