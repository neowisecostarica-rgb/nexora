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
import { Switch } from "@/components/ui/switch";
import { Plus, Calculator, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";

const EMPTY_PROFILE = { name: "", sales_channel: "retail", target_margin_percent: 30, min_margin_percent: 15, rounding_rule: "round_10", active: true };

function applyRounding(price, rule) {
  if (rule === "round_1") return Math.ceil(price);
  if (rule === "round_5") return Math.ceil(price / 5) * 5;
  if (rule === "round_10") return Math.ceil(price / 10) * 10;
  return price;
}

export default function PricingEngine() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: profiles = [] } = useQuery({
    queryKey: ["pricingProfiles"],
    queryFn: () => base44.entities.PricingProfiles.list("-created_date", 50),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryUnits.list("-created_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? base44.entities.PricingProfiles.update(editing.id, data) : base44.entities.PricingProfiles.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pricingProfiles"] }); setDialogOpen(false); setEditing(null); setForm(EMPTY_PROFILE); },
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const retailProfile = profiles.find((p) => p.sales_channel === "retail" && p.active);
      const wholesaleProfile = profiles.find((p) => p.sales_channel === "wholesale" && p.active);
      const retailMargin = retailProfile ? retailProfile.target_margin_percent / 100 : 0.3;
      const wholesaleMargin = wholesaleProfile ? wholesaleProfile.target_margin_percent / 100 : 0.15;
      const minMargin = retailProfile ? retailProfile.min_margin_percent / 100 : 0.1;
      const retailRounding = retailProfile?.rounding_rule || "round_10";
      const wholesaleRounding = wholesaleProfile?.rounding_rule || "round_10";

      const available = inventory.filter((u) => u.status === "available" && u.total_real_unit_cost > 0);
      let count = 0;
      for (const u of available) {
        const cost = u.total_real_unit_cost;
        const retail = applyRounding(cost * (1 + retailMargin), retailRounding);
        const wholesale = applyRounding(cost * (1 + wholesaleMargin), wholesaleRounding);
        const minimum = applyRounding(cost * (1 + minMargin), "round_1");
        await base44.entities.InventoryUnits.update(u.id, {
          retail_price: retail,
          wholesale_price: wholesale,
          minimum_sale_price: minimum,
          suggested_sale_price: retail,
          pricing_profile_id: retailProfile?.id || "",
        });
        count++;
      }
      toast({ title: "Precios recalculados", description: `${count} unidades actualizadas.` });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); },
  });

  const openNew = () => { setForm(EMPTY_PROFILE); setEditing(null); setDialogOpen(true); };
  const openEdit = (p) => { setForm(p); setEditing(p); setDialogOpen(true); };
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const availableUnits = inventory.filter((u) => u.status === "available");

  return (
    <div>
      <PageHeader title="Pricing Engine" subtitle="Perfiles de margen y cálculo de precios">
        <Button variant="outline" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
          {recalcMutation.isPending ? "Recalculando…" : "Recalcular Precios"}
        </Button>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Perfil</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {profiles.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(p)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{p.name}</CardTitle>
                <span className={`w-2 h-2 rounded-full ${p.active ? "bg-green-500" : "bg-gray-400"}`}></span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Canal</p>
                  <p className="font-medium capitalize">{p.sales_channel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Margen Objetivo</p>
                  <p className="font-medium">{p.target_margin_percent}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Margen Mínimo</p>
                  <p className="font-medium">{p.min_margin_percent}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Redondeo</p>
                  <p className="font-medium">{p.rounding_rule?.replace("round_", "× ") || "Ninguno"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vista Previa de Precios — Unidades Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {availableUnits.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay unidades disponibles para calcular precios</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Costo Real</TableHead>
                    <TableHead>Retail</TableHead>
                    <TableHead>Mayoreo</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Utilidad Retail</TableHead>
                    <TableHead>Margen %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableUnits.slice(0, 20).map((u) => {
                    const profit = (u.retail_price || 0) - (u.total_real_unit_cost || 0);
                    const margin = u.total_real_unit_cost > 0 ? (profit / u.total_real_unit_cost) * 100 : 0;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.brand} {u.model}</TableCell>
                        <TableCell>{formatCurrency(u.total_real_unit_cost)}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(u.retail_price)}</TableCell>
                        <TableCell>{formatCurrency(u.wholesale_price)}</TableCell>
                        <TableCell>{formatCurrency(u.minimum_sale_price)}</TableCell>
                        <TableCell className="text-green-600 font-medium">{formatCurrency(profit)}</TableCell>
                        <TableCell>{formatPercent(margin)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Perfil" : "Nuevo Perfil de Pricing"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => sf("name", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Select value={form.sales_channel} onValueChange={(v) => sf("sales_channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Mayoreo</SelectItem>
                  <SelectItem value="promo">Promoción</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Redondeo</Label>
              <Select value={form.rounding_rule} onValueChange={(v) => sf("rounding_rule", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  <SelectItem value="round_1">Al entero</SelectItem>
                  <SelectItem value="round_5">Múltiplo de 5</SelectItem>
                  <SelectItem value="round_10">Múltiplo de 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Margen Objetivo (%)</Label><Input type="number" value={form.target_margin_percent || ""} onChange={(e) => sf("target_margin_percent", parseFloat(e.target.value) || 0)} /></div>
            <div className="space-y-1.5"><Label>Margen Mínimo (%)</Label><Input type="number" value={form.min_margin_percent || ""} onChange={(e) => sf("min_margin_percent", parseFloat(e.target.value) || 0)} /></div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={form.active !== false} onCheckedChange={(v) => sf("active", v)} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}