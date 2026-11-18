/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Define navegación Nexora, menú móvil y expansión lateral sincronizada con layout.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
import React, { useState } from "react";
import OrganizationSwitcher from './OrganizationSwitcher';
import {useQuery} from "@tanstack/react-query";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Truck, Monitor,
  Calculator, FileText, HandCoins, Users, Settings,
  ChevronLeft, ChevronRight, Receipt, Layers, Navigation, Warehouse, Menu, X, Sparkles
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Inicio guiado", icon: Sparkles, path: "/onboarding" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Proveedores", icon: Users, path: "/suppliers" },
  { label: "Compras", icon: ShoppingCart, path: "/purchases" },
  { label: "Importaciones", icon: Truck, path: "/imports" },
  { label: "Seguimiento", icon: Navigation, path: "/tracking" },
  { label: "Bodegas", icon: Warehouse, path: "/warehouses" },
  { label: "Inventario", icon: Monitor, path: "/inventory" },
  { label: "Catálogo", icon: Layers, path: "/catalog" },
  { label: "Pricing", icon: Calculator, path: "/pricing" },
  { label: "Clientes", icon: Users, path: "/customers" },
  { label: "Cotizaciones", icon: FileText, path: "/quotes" },
  { label: "Ventas", icon: HandCoins, path: "/sales" },
  { label: "Gastos", icon: Receipt, path: "/expenses" },
  { label: "Config", icon: Settings, path: "/settings" },
];

export default function Sidebar({ collapsed = false, onCollapsedChange = () => {} }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const {user}=useAuth();
  // Visibility is derived from server capability; the endpoint enforces access again.
  const capability=useQuery({queryKey:['platform-capabilities',user?.id],queryFn:async()=>{
    const r=await base44.functions.invoke('platformAdmin',{action:'capabilities'});return r.data;
  },enabled:!!user?.id,staleTime:0});
  const navigation=capability.data?.is_super_admin?[...NAV_ITEMS,{label:"Super Admin",icon:Settings,path:"/platform"}]:NAV_ITEMS;

  return (
    <>
    <header className="fixed inset-x-0 top-0 h-16 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center gap-3 px-4 md:hidden">
      <button type="button" aria-label="Abrir menú" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-sidebar-accent"><Menu className="w-5 h-5" /></button>
      <span className="font-bold tracking-wide">Nexora</span>
    </header>
    {mobileOpen && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside
      aria-label="Navegación principal"
      className={`fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        flex flex-col z-50 transition-all duration-300 ${collapsed ? "md:w-16" : "md:w-60"} w-72 max-w-[85vw] ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
    >
      <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed && !mobileOpen ? "justify-center" : "justify-between"}`}>
        {(!collapsed || mobileOpen) && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-wide">Nexora</span>
          </div>
        )}
        <button
          type="button"
          aria-label={mobileOpen ? 'Cerrar menú' : collapsed ? 'Expandir menú' : 'Contraer menú'}
          onClick={() => mobileOpen ? setMobileOpen(false) : onCollapsedChange(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {(!collapsed || mobileOpen) && <OrganizationSwitcher />}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }
                ${collapsed && !mobileOpen ? "justify-center" : ""}`}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {(!collapsed || mobileOpen) && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/40 text-center tracking-wider uppercase">
            Nexora · Gestión de importaciones
          </p>
        </div>
      )}
    </aside>
    </>
  );
}