import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, BookOpen, GitBranch, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("definitions");
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [mirrorResult, setMirrorResult] = useState(null);
  const [linkResult, setLinkResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const qc = useQueryClient();

  const { data: definitions = [], isLoading: loadingDefs } = useQuery({
    queryKey: ["productDefinitions"],
    queryFn: () => base44.entities.ProductDefinition.list("-created_date", 200),
  });

  const { data: variants = [], isLoading: loadingVars } = useQuery({
    queryKey: ["productVariants"],
    queryFn: () => base44.entities.ProductVariant.list("-created_date", 200),
  });

  const runAction = async (action) => {
    setIsRunning(true);
    const res = await base44.functions.invoke("normalizeCatalog", { action });
    const data = res.data;
    if (action === "analyze") setAnalyzeResult(data);
    if (action === "mirror") { setMirrorResult(data); qc.invalidateQueries({ queryKey: ["productDefinitions"] }); }
    if (action === "link") { setLinkResult(data); }
    setIsRunning(false);
  };

  const filteredDefs = definitions.filter(d => {
    const s = `${d.brand} ${d.model} ${d.category_key}`.toLowerCase();
    return !search || s.includes(search.toLowerCase());
  });

  const filteredVars = variants.filter(v => {
    const s = `${v.sku} ${v.product_definition_id}`.toLowerCase();
    return !search || s.includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Catálogo Maestro"
        subtitle="M1 — ProductDefinition & ProductVariant (Espejo de Datos)"
      />

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: "definitions", label: "Definiciones", icon: BookOpen },
          { id: "variants", label: "Variantes", icon: GitBranch },
          { id: "tools", label: "Herramientas M1", icon: RefreshCw },
        ].map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabIcon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Definiciones ── */}
      {activeTab === "definitions" && (
        <div>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="bg-card rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Familia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDefs ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando…</TableCell></TableRow>
                ) : filteredDefs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin definiciones. Usa Herramientas M1 → mirror para generar.</TableCell></TableRow>
                ) : filteredDefs.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.brand}</TableCell>
                    <TableCell>{d.model}</TableCell>
                    <TableCell><Badge variant="outline">{d.category_key}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{d.product_family_code || "—"}</TableCell>
                    <TableCell>
                      <Badge className={d.is_active !== false ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-500"}>
                        {d.is_active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">{d.identity_hash?.slice(0, 16)}…</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Variantes ── */}
      {activeTab === "variants" && (
        <div>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar SKU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="bg-card rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>ProductDefinition ID</TableHead>
                  <TableHead>Atributos</TableHead>
                  <TableHead>Costo Base Override</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingVars ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando…</TableCell></TableRow>
                ) : filteredVars.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin variantes registradas aún.</TableCell></TableRow>
                ) : filteredVars.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm font-semibold">{v.sku}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{v.product_definition_id}</TableCell>
                    <TableCell className="text-xs">{v.attributes ? JSON.stringify(v.attributes) : "—"}</TableCell>
                    <TableCell>{v.base_cost_override ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={v.is_active !== false ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-500"}>
                        {v.is_active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Herramientas M1 ── */}
      {activeTab === "tools" && (
        <div className="space-y-6 max-w-3xl">

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <strong>🛡️ Modo Satélite M1:</strong> Estas herramientas <strong>NO modifican</strong> el motor de costos, pricing, ventas ni reservas.
            Los campos <code>product_definition_id</code> y <code>product_variant_id</code> son opcionales y nullable.
          </div>

          {/* Analyze */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">1. Analizar Catálogo</h3>
                <p className="text-sm text-muted-foreground">Solo lectura. Genera reporte de candidatos. No escribe nada.</p>
              </div>
              <Button variant="outline" onClick={() => runAction("analyze")} disabled={isRunning}>
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analizar"}
              </Button>
            </div>
            {analyzeResult && (
              <div className="text-sm bg-muted rounded-lg p-3 space-y-1">
                <p><strong>Candidatos exactos:</strong> {analyzeResult.total_exact_candidates}</p>
                <p><strong>Duplicados fuzzy (solo reporte):</strong> {analyzeResult.fuzzy_duplicate_candidates?.length || 0}</p>
                {analyzeResult.fuzzy_duplicate_candidates?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-yellow-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Requieren revisión humana:</p>
                    {analyzeResult.fuzzy_duplicate_candidates.map((fc, i) => (
                      <p key={i} className="text-xs text-muted-foreground pl-4">
                        "{fc.candidate_a.brand} {fc.candidate_a.model}" ↔ "{fc.candidate_b.brand} {fc.candidate_b.model}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mirror */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">2. Espejo de Catálogo (Mirror)</h3>
                <p className="text-sm text-muted-foreground">Crea ProductDefinitions por hash exacto. Idempotente. No fusiona por similitud.</p>
              </div>
              <Button onClick={() => runAction("mirror")} disabled={isRunning}>
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ejecutar Mirror"}
              </Button>
            </div>
            {mirrorResult && (
              <div className="text-sm bg-muted rounded-lg p-3 space-y-1">
                <p className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /><strong>Creadas:</strong> {mirrorResult.created_count}</p>
                <p><strong>Ya existían:</strong> {mirrorResult.already_existed}</p>
                {mirrorResult.created?.map((c, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-4">+ {c.brand} {c.model} ({c.category_key})</p>
                ))}
              </div>
            )}
          </div>

          {/* Link */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">3. Vincular Registros (Link)</h3>
                <p className="text-sm text-muted-foreground">Asocia InventoryUnits y PurchaseItems a su ProductDefinition. Idempotente. Nullable si no hay match exacto.</p>
              </div>
              <Button variant="outline" onClick={() => runAction("link")} disabled={isRunning}>
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}
              </Button>
            </div>
            {linkResult && (
              <div className="text-sm bg-muted rounded-lg p-3 space-y-1">
                <p><strong>PurchaseItems vinculados:</strong> {linkResult.linked_purchase_items}</p>
                <p><strong>InventoryUnits vinculadas:</strong> {linkResult.linked_inventory_units}</p>
                <p><strong>Sin match exacto (null):</strong> {linkResult.skipped_no_match}</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}