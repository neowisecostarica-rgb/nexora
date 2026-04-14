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
import { Plus, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useToast } from "@/components/ui/use-toast";

const EMPTY_PROFILE = {
  name: "",
  scope_type: "global",
  category_key: "",
  margin_retail: 30,
  margin_wholesale: 15,
  margin_minimum: 5,
  rounding_rule: "none",
  is_default: false,
  is_active: true,
};

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
    mutationFn: (data) =>
      editing
        ? base44.entities.PricingProfiles.update(editing.id, data)
        : base44.entities.PricingProfiles.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricingProfiles"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_PROFILE);
    },
  });

  // Recalculación masiva vía backend — NO en frontend
  const recalcMutation = useMutation({
    mutationFn: async () => {
      const available = inventory.filter((u) => u.status === "available");
      let count = 0;
      for (const u of available) {
        await base44.functions.invoke("calculateAndCachePricing", {
          inventory_unit_id: u.id,
        });
        count++;
      }
      return count;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Precios recalculados", description: `${count} unidades actualizadas.` });
    },
  });

  const openNew = () => { setForm(EMPTY_PROFILE); setEditing(null); setDialogOpen(true); };
  const openEdit = (p) => { setForm({ ...EMPTY_PROFILE, ...p }); setEditing(p); setDialogOpen(true); };
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const availableUnits = inventory.filter((u) => u.status === "available");

  return (
    <div>
      <PageHeader title="Pricing Engine" subtitle="Perfiles de margen y cálculo de precios">
        <Button variant="outline" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
          {recalcMutation.isPending ? "Recalculando…" : "Recalcular Todos"}
        </Button>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuevo Perfil</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {profiles.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(p)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{p.name}</CardTitle>
                <div className="flex items-center gap-1.5">
                  {p.is_default && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>}
                  <span className={`w-2 h-2 rounded-full ${p.is_active ? "bg-green-500" : "bg-gray-400"}`}></span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Alcance</p>
                  <p className="font-medium capitalize">{p.scope_type}</p>
                </div>
                {p.category_key && (
                  <div>
                    <p className="text-muted-foreground text-xs">Categoría</p>
                    <p className="font-medium">{p.category_key}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Margen Retail</p>
                  <p className="font-medium">{p.margin_retail}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Margen Mayoreo</p>
                  <p className="font-medium">{p.margin_wholesale}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Margen Mínimo</p>
                  <p className="font-medium">{p.margin_minimum}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Redondeo</p>
                  <p className="font-medium">{p.rounding_rule === "none" ? "Ninguno" : p.rounding_rule?.replace("round_", "×")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vista Previa — Unidades Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {availableUnits.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay unidades disponibles</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Costo Real</TableHead>
                    <TableHead>Retail</TableHead>
                    <TableHead>Mayoreo</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Margen %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableUnits.slice(0, 20).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {u.normalized_display_name || u.category_key || "—"}
                      </TableCell>
                      <TableCell>{formatCurrency(u.real_unit_cost)}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatCurrency(u.retail_price)}</TableCell>
                      <TableCell>{formatCurrency(u.wholesale_price)}</TableCell>
                      <TableCell>{formatCurrency(u.minimum_price)}</TableCell>
                      <TableCell>{formatPercent(u.margin_percent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Perfil" : "Nuevo Perfil de Pricing"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => sf("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alcance</Label>
              <Select value={form.scope_type} onValueChange={(v) => sf("scope_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="unit_override">Override por unidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope_type === "category" && (
              <div className="space-y-1.5">
                <Label>Clave de Categoría</Label>
                <Input
                  placeholder="ej. laptops, sneakers"
                  value={form.category_key || ""}
                  onChange={(e) => sf("category_key", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Margen Retail (%)</Label>
              <Input type="number" value={form.margin_retail ?? ""} onChange={(e) => sf("margin_retail", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Margen Mayoreo (%)</Label>
              <Input type="number" value={form.margin_wholesale ?? ""} onChange={(e) => sf("margin_wholesale", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Margen Mínimo (%)</Label>
              <Input type="number" value={form.margin_minimum ?? ""} onChange={(e) => sf("margin_minimum", parseFloat(e.target.value) || 0)} />
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
                  <SelectItem value="round_100">Múltiplo de 100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={!!form.is_default} onCheckedChange={(v) => sf("is_default", v)} />
              <Label>Perfil por defecto</Label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={form.is_active !== false} onCheckedChange={(v) => sf("is_active", v)} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}