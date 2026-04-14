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
import { Plus, Search, FileText, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import OrgProfileAlert from "@/components/settings/OrgProfileAlert";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildOrgSnapshot, validateProfileForOperation } from "@/lib/orgProfileSnapshot";
import { addDays, format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function QuotesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => base44.entities.Quotes.list("-created_date", 200),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customers.list("-created_date", 200),
  });
  const { data: orgProfiles = [] } = useQuery({
    queryKey: ["orgProfile"],
    queryFn: () => base44.entities.OrganizationProfile.filter({ active: true }),
  });

  const orgProfile = orgProfiles[0] || null;
  const { valid, missing } = validateProfileForOperation(orgProfile);

  const openNew = () => {
    if (!valid) {
      toast({ title: "Perfil incompleto", description: "Completa el perfil de empresa antes de cotizar.", variant: "destructive" });
      return;
    }
    const today = new Date();
    const validUntil = addDays(today, orgProfile?.quote_validity_days || 7);
    setForm({
      customer_id: "",
      quote_date: format(today, "yyyy-MM-dd"),
      valid_until: format(validUntil, "yyyy-MM-dd"),
      sales_channel: "wholesale",
      status: "draft",
      notes: orgProfile?.default_quote_notes || "",
      terms_conditions_snapshot: orgProfile?.default_terms_conditions || "",
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Generar número de documento transaccional
      const numRes = await base44.functions.invoke("generateDocumentNumber", { type: "quote" });
      const quoteNumber = numRes?.data?.document_number;
      if (!quoteNumber) throw new Error("No se pudo generar el número de cotización");

      // 2. Construir snapshot versionado de organización
      const orgSnapshot = buildOrgSnapshot(orgProfile);

      const customer = customers.find((c) => c.id === data.customer_id);
      return base44.entities.Quotes.create({
        ...data,
        quote_number: quoteNumber,
        customer_name: customer?.full_name || "",
        organization_profile_snapshot: orgSnapshot,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["orgProfile"] });
      setDialogOpen(false);
    },
  });

  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = quotes.filter((q) =>
    `${q.quote_number} ${q.customer_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Cotizaciones" subtitle="Gestión de cotizaciones mayoristas">
        <Button onClick={openNew} disabled={!valid}>
          <Plus className="w-4 h-4 mr-2" />Nueva Cotización
        </Button>
      </PageHeader>

      {!valid && <div className="mb-4"><OrgProfileAlert missing={missing} /></div>}

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cotización…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={FileText} title="Sin cotizaciones" description="Crea tu primera cotización mayorista" actionLabel="Nueva Cotización" onAction={openNew} />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Válida hasta</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium font-mono text-xs">{q.quote_number}</TableCell>
                  <TableCell>{q.customer_name || "—"}</TableCell>
                  <TableCell>{formatDate(q.quote_date)}</TableCell>
                  <TableCell>{formatDate(q.valid_until)}</TableCell>
                  <TableCell><span className="capitalize">{q.sales_channel === "wholesale" ? "Mayoreo" : q.sales_channel}</span></TableCell>
                  <TableCell className="font-semibold">{formatCurrency(q.total)}</TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell>
                    <Link to={`/quotes/${q.id}`}>
                      <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Cotización Mayorista</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.customer_id} onValueChange={(v) => sf("customer_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente…" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}{c.company_name ? ` — ${c.company_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={form.quote_date || ""} onChange={(e) => sf("quote_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Válida hasta</Label>
              <Input type="date" value={form.valid_until || ""} onChange={(e) => sf("valid_until", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Canal</Label>
              <Select value={form.sales_channel} onValueChange={(v) => sf("sales_channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wholesale">Mayoreo</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notas</Label>
              <Textarea rows={3} value={form.notes || ""} onChange={(e) => sf("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.customer_id || createMutation.isPending}>
              {createMutation.isPending ? "Creando…" : "Crear Cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}