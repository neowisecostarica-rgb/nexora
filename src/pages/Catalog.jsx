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

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: () =>
      base44.functions.invoke("getGroupedCatalogItems", {}).then((r) => r.data),
    staleTime: 60_000,
  });

  // Contrato v1.0: data.groups
  const groups = data?.groups || [];

  const categories = [...new Set(groups.map((g) => g.category_key).filter(Boolean))].sort();

  const filtered = groups.filter((g) => {
    const matchSearch =
      !search ||
      (g.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.category_key || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || g.category_key === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div>
      <PageHeader
        title="Catálogo"
        subtitle={
          isLoading
            ? "Cargando…"
            : `${filtered.length} grupo${filtered.length !== 1 ? "s" : ""} disponibles`
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
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
          description="No hay unidades disponibles en catálogo. Verifique que las unidades tengan perfil de precios asignado."
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((group) => (
            <CatalogCard key={group.group_key} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogCard({ group }) {
  const imgSrc = group.main_image || PLACEHOLDER;

  return (
    <div className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200 group flex flex-col">
      <div className="relative overflow-hidden h-44 bg-muted">
        <img
          src={imgSrc}
          alt={group.display_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = PLACEHOLDER; }}
        />
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs font-medium capitalize">
            {group.category_key}
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs font-semibold flex items-center gap-1">
            <Package className="w-3 h-3" />{group.available_quantity} uds.
          </Badge>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-bold text-foreground leading-tight line-clamp-2">
            {group.display_name || group.category_key}
          </h3>
        </div>

        <div className="mt-4 pt-3 border-t flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="text-lg font-bold text-green-600">
              {group.price_from ? formatCurrency(group.price_from) : "—"}
            </p>
            {group.wholesale_price_from && (
              <p className="text-xs text-muted-foreground">
                Mayoreo: {formatCurrency(group.wholesale_price_from)}
              </p>
            )}
          </div>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Consultar
          </button>
        </div>
      </div>
    </div>
  );
}