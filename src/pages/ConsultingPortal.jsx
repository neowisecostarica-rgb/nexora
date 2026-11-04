/**
 * Portal limitado de Consulting. Solo consume una respuesta pública y reducida del
 * backend partnerOverview. No usa entities/list ni comparte el panel Super Admin.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { PackageSearch, RefreshCw, Truck } from "lucide-react";

const STATUS = {
  planning: "Planificación", shipped: "Enviado", in_customs: "Aduanas",
  delivered: "Entregado", closed: "Cerrado", in_transit: "En tránsito",
  label_created: "Guía creada", out_for_delivery: "En reparto",
  exception: "Incidencia", returned: "Devuelto", unknown: "Por confirmar"
};
const date = value => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleDateString("es-CR");
};

export default function ConsultingPortal() {
  const query = useQuery({
    queryKey: ["consulting-portal-overview"],
    queryFn: async () => {
      const response = await base44.functions.invoke("partnerOverview", { action: "overview" });
      if (response?.data?.error) throw new Error(response.data.error);
      if (!response?.data?.read_only || !Array.isArray(response.data.operations)) throw new Error("Respuesta de acceso no válida");
      return response.data;
    },
    retry: false, staleTime: 0
  });
  return <div className="min-h-screen bg-background">
    <header className="border-b px-6 py-4 flex items-center justify-between">
      <div className="font-semibold tracking-wide">NEXORA · Consulting</div>
      <span className="text-xs text-muted-foreground">Acceso de solo consulta</span>
    </header>
    <main className="max-w-5xl mx-auto p-5 md:p-8 space-y-6">
      <PageHeader title="Seguimiento de operaciones" subtitle="Cargas y guías expresamente autorizadas para tu organización" />
      {query.isLoading && <p role="status">Verificando autorizaciones…</p>}
      {query.isError && <Card><CardContent className="p-5 space-y-3">
        <p role="alert" className="text-sm text-destructive">No se pudo verificar tu acceso a Consulting. Ninguna operación se mostrará sin autorización.</p>
        <Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="w-4 h-4 mr-2" />Reintentar</Button>
      </CardContent></Card>}
      {query.isSuccess && <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p>{query.data.operations.length} operaciones autorizadas</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className="w-4 h-4 mr-2" />Actualizar</Button>
        </div>
        {!query.data.operations.length && <Card><CardContent className="p-6 text-sm text-muted-foreground">
          No hay operaciones con permisos de lectura vigentes. Solicitá la autorización al administrador de la plataforma.
        </CardContent></Card>}
        {query.data.operations.map(operation => <Card key={operation.id}><CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap justify-between gap-3">
            <div><p className="font-semibold flex items-center gap-2"><PackageSearch className="w-4 h-4" />{operation.batch_code}</p>
            <p className="text-sm text-muted-foreground">{operation.client_name}</p></div>
            <span className="text-sm font-medium">{STATUS[operation.status] || STATUS.unknown}</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>Salida: {date(operation.ship_date)}</span><span>Llegada: {date(operation.arrival_date)}</span>
          </div>
          {operation.trackings.length > 0 && <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2"><Truck className="w-4 h-4" />Guías autorizadas</p>
            {operation.trackings.map((t, i) => <div key={i} className="text-sm flex flex-wrap justify-between gap-2">
              <span>{t.courier || "Courier"} · {t.tracking_number}</span>
              <span>{STATUS[t.status] || STATUS.unknown} · {date(t.expected_date)}</span>
              {t.last_event && <p className="w-full text-xs text-muted-foreground">{t.last_event}</p>}
            </div>)}
          </div>}
        </CardContent></Card>)}
      </div>}
    </main>
  </div>;
}
