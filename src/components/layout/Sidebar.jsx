import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Truck, Monitor,
  Calculator, FileText, HandCoins, Users, Settings,
  ChevronLeft, ChevronRight, Receipt
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Proveedores", icon: Users, path: "/suppliers" },
  { label: "Compras", icon: ShoppingCart, path: "/purchases" },
  { label: "Importaciones", icon: Truck, path: "/imports" },
  { label: "Inventario", icon: Monitor, path: "/inventory" },
  { label: "Pricing", icon: Calculator, path: "/pricing" },
  { label: "Clientes", icon: Users, path: "/customers" },
  { label: "Cotizaciones", icon: FileText, path: "/quotes" },
  { label: "Ventas", icon: HandCoins, path: "/sales" },
  { label: "Gastos", icon: Receipt, path: "/expenses" },
  { label: "Config", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        flex flex-col z-50 transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
    >
      <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-wide">TecnoUsados</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }
                ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/40 text-center tracking-wider uppercase">
            TecnoUsados OS v1.0
          </p>
        </div>
      )}
    </aside>
  );
}