import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Layers } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/formatters";

const PLACEHOLDER = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop";

const CONDITION_COLORS = {
  "A+": "bg-emerald-500/10 text-emerald-600",
  "A":  "bg-green-500/10 text-green-600",
  "B+": "bg-blue-500/10 text-blue-600",
  "B":  "bg-yellow-500/10 text-yellow-600",
  "C":  "bg-orange-500/10 text-orange-600",
  "D":  "bg-red-500/10 text-red-600",
};

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => base44.functions.invoke("getGroupedCatalogItems", {}).then(r => r.data),
    staleTime: 60_000,
  });

  const items = data?.catalog || [];

  const brands = [...new Set(items.map(i => i.brand).filter(Boolean))].sort();

  const filtered = items.filter(item => {
    const matchSearch = !search || `${item.brand} ${item.model} ${item.cpu} ${item.spec_summary}`.toLowerCase().includes(search.toLowerCase());
    const matchCondition = conditionFilter === "all" || item.condition_grade === conditionFilter;
    const matchBrand = brandFilter === "all" || item.brand === brandFilter;
    return matchSearch && matchCondition && matchBrand;
  });

  return (
    <div>
      <PageHeader
        title="Catálogo"
        subtitle={isLoading ? "Cargando…" : `${filtered.length} grupo${filtered.length !== 1 ? 's' : ''} disponibles`}
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar marca, modelo, CPU…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Condición" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {["A+","A","B+","B","C","D"].map(c => <SelectItem key={c} value={c}>Grado {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border h-72 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Layers}
          title="Sin productos disponibles"
          description="No hay unidades disponibles para mostrar en catálogo. Verifique que las unidades tengan perfil de precios asignado."
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <CatalogCard key={item.group_key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogCard({ item }) {
  const imgSrc = item.representative_image || PLACEHOLDER;

  return (
    <div className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col">
      <div className="relative overflow-hidden h-44 bg-muted">
        <img
          src={imgSrc}
          alt={`${item.brand} ${item.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = PLACEHOLDER; }}
        />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge className={`text-xs font-semibold ${CONDITION_COLORS[item.condition_grade] || 'bg-gray-500/10 text-gray-500'}`}>
            Grado {item.condition_grade}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs font-semibold flex items-center gap-1">
            <Package className="w-3 h-3" />{item.stock_available} uds.
          </Badge>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.brand}</p>
          <h3 className="font-bold text-foreground mt-0.5 leading-tight">{item.model}</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.spec_summary}</p>
        </div>

        <div className="mt-4 pt-3 border-t flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(item.base_price_from)}</p>
          </div>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Consultar
          </button>
        </div>
      </div>
    </div>
  );
}