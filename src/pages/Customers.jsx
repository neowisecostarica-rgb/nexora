/**
 * Propósito: CRM de clientes y prospectos con etapa comercial, seguimiento y bitácora de contactos.
 * Datos: Customers, CustomerProfiles y CustomerInteractions vía gateway (tenantData).
 * Límites: no crea usuarios/membresías ni envía mensajes; el origen del contacto es declarado por el usuario.
 * Referencia: docs/NEXORA-BASELINE.md (contactos ≠ tenants).
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Users, MessageSquare, UserPlus, CalendarClock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import CustomerDialog, { LIFECYCLE_LABELS } from "@/components/crm/CustomerDialog";
import CustomerInteractionsDialog from "@/components/crm/CustomerInteractionsDialog";
import { formatDate } from "@/lib/formatters";

const TYPE_LABELS = { individual: "Individuo", business: "Empresa", reseller: "Revendedor" };
const STAGE_STYLES = {
  prospect: "bg-blue-500/10 text-blue-600",
  active: "bg-green-500/10 text-green-600",
  inactive: "bg-gray-500/10 text-gray-600",
  blocked: "bg-red-500/10 text-red-600",
};

const today = () => new Date().toISOString().slice(0, 10);
const inSevenDays = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export default function CustomersPage() {
  const [tab, setTab] = useState("clients");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [interactionsFor, setInteractionsFor] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customers.list("-created_date", 500),
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["customerProfiles"],
    queryFn: () => base44.entities.CustomerProfiles.list("-created_date", 500),
  });

  const profileByCustomer = {};
  profiles.forEach((p) => { if (p.customer_id) profileByCustomer[p.customer_id] = p; });

  const saveMutation = useMutation({
    mutationFn: async ({ customer, profile }) => {
      const saved = editing?.id
        ? await base44.entities.Customers.update(editing.id, customer)
        : await base44.entities.Customers.create(customer);
      const payload = {
        customer_id: saved.id,
        lifecycle_status: profile.lifecycle_status,
        source: profile.source || "",
        next_follow_up_date: profile.next_follow_up_date || null,
        priority: profile.priority || "normal",
      };
      const existing = profileByCustomer[saved.id];
      if (existing) await base44.entities.CustomerProfiles.update(existing.id, payload);
      else await base44.entities.CustomerProfiles.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customerProfiles"] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const openNew = (stage) => {
    setEditing(stage === "prospect" ? { __stage: "prospect" } : null);
    setDialogOpen(true);
  };
  const openEdit = (c) => { setEditing(c); setDialogOpen(true); };

  const stageOf = (c) => profileByCustomer[c.id]?.lifecycle_status || "active";
  const followUpOf = (c) => profileByCustomer[c.id]?.next_follow_up_date || null;

  const withSearch = (rows) => rows.filter((c) =>
    `${c.full_name} ${c.company_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const clients = withSearch(customers.filter((c) => stageOf(c) !== "prospect"));
  const prospects = withSearch(customers.filter((c) => stageOf(c) === "prospect"));
  const followUps = withSearch(customers)
    .filter((c) => followUpOf(c))
    .sort((a, b) => followUpOf(a).localeCompare(followUpOf(b)));

  const rows = tab === "clients" ? clients : tab === "prospects" ? prospects : followUps;
  const limitDate = inSevenDays();

  return (
    <div>
      <PageHeader title="Clientes y Prospectos" subtitle={`${clients.length} clientes · ${prospects.length} prospectos`}>
        <Button onClick={() => openNew("prospect")}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
      </PageHeader>

      <div className="flex gap-2 mb-5 border-b">
        {[
          { id: "clients", label: "Clientes", icon: Users, count: clients.length },
          { id: "prospects", label: "Prospectos", icon: UserPlus, count: prospects.length },
          { id: "followup", label: "Seguimiento", icon: CalendarClock, count: followUps.length },
        ].map(({ id, label, icon: TabIcon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabIcon className="w-4 h-4" />
            {label}
            <span className="text-xs text-muted-foreground">({count})</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {rows.length === 0 && !isLoading ? (
        <EmptyState
          icon={tab === "prospects" ? UserPlus : Users}
          title={tab === "prospects" ? "Sin prospectos" : tab === "followup" ? "Sin seguimientos agendados" : "Sin clientes"}
          description="Registrá contactos comerciales y agendá su próximo seguimiento."
          actionLabel="Nuevo contacto"
          onAction={() => openNew(tab === "prospects" ? "prospect" : undefined)}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>{tab === "followup" ? "Seguimiento" : "Próximo contacto"}</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const stage = stageOf(c);
                const due = followUpOf(c);
                const overdue = due && due < today();
                return (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.company_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="border-0 text-xs">{TYPE_LABELS[c.customer_type] || c.customer_type}</Badge></TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`border-0 text-xs ${STAGE_STYLES[stage] || STAGE_STYLES.active}`}>
                        {LIFECYCLE_LABELS[stage] || stage}
                      </Badge>
                    </TableCell>
                    <TableCell className={overdue ? "text-red-600 font-medium text-sm" : "text-sm"}>
                      {due ? `${formatDate(due)}${overdue ? " · vencido" : ""}` : "Sin agendar"}
                      {due && !overdue && due <= limitDate ? <span className="ml-1.5 text-amber-600 text-xs">próximo</span> : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Seguimiento" onClick={() => setInteractionsFor(c)}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(c)}>
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

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        initial={editing?.id ? editing : null}
        initialProfile={editing?.id ? profileByCustomer[editing.id] : (editing?.__stage === "prospect" ? { lifecycle_status: "prospect" } : null)}
        onSave={(customer, profile) => saveMutation.mutate({ customer, profile })}
        saving={saveMutation.isPending}
      />

      <CustomerInteractionsDialog
        customer={interactionsFor}
        profile={interactionsFor ? profileByCustomer[interactionsFor.id] : null}
        open={!!interactionsFor}
        onClose={() => setInteractionsFor(null)}
      />
    </div>
  );
}