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
import { Plus, Receipt } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency, formatDate } from "@/lib/formatters";

const CATEGORY_LABELS = { repair: "Reparación", packaging: "Empaque", courier: "Mensajería", advertising: "Publicidad", commission: "Comisión", other: "Otro" };

const EMPTY = { date: new Date().toISOString().split("T")[0], category: "repair", amount: 0, notes: "" };

export default function ExpensesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expenses.list("-date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expenses.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setDialogOpen(false); setForm(EMPTY); },
  });

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Gastos" subtitle={`Total: ${formatCurrency(totalExpenses)}`}>
        <Button onClick={() => { setForm(EMPTY); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nuevo Gasto</Button>
      </PageHeader>

      {expenses.length === 0 && !isLoading ? (
        <EmptyState icon={Receipt} title="Sin gastos" description="Registra gastos extra no incluidos en compras" actionLabel="Nuevo Gasto" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell>{CATEGORY_LABELS[e.category] || e.category}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Gasto</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Fecha *</Label><Input type="date" value={form.date} onChange={(e) => sf("date", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={form.category} onValueChange={(v) => sf("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Reparación</SelectItem>
                  <SelectItem value="packaging">Empaque</SelectItem>
                  <SelectItem value="courier">Mensajería</SelectItem>
                  <SelectItem value="advertising">Publicidad</SelectItem>
                  <SelectItem value="commission">Comisión</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Monto *</Label><Input type="number" step="0.01" value={form.amount || ""} onChange={(e) => sf("amount", parseFloat(e.target.value) || 0)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Textarea value={form.notes || ""} onChange={(e) => sf("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.amount || createMutation.isPending}>
              {createMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}