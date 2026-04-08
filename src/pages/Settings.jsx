import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Calculator, DollarSign, Truck, Tag } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Configuración" subtitle="Ajustes generales del sistema" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calculator className="w-4 h-4 text-primary" />Fórmulas de Costo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Costo de Compra por Unidad</p>
              <code className="text-xs text-muted-foreground">order_total_paid / total_units</code>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Costo de Importación por Unidad</p>
              <code className="text-xs text-muted-foreground">(aduana + flete + transporte + extras) / total_units</code>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Costo Real Total</p>
              <code className="text-xs text-muted-foreground">compra + importación + reparación + costos_locales</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-primary" />Fórmulas de Precio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Precio Retail</p>
              <code className="text-xs text-muted-foreground">costo_real × (1 + margen_retail%)</code>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Precio Mayoreo</p>
              <code className="text-xs text-muted-foreground">costo_real × (1 + margen_mayoreo%)</code>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">Utilidad</p>
              <code className="text-xs text-muted-foreground">precio_venta - costo_real_total</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-primary" />Reglas de Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Si existe <strong>order_total_paid</strong>, ese valor es la base de costo oficial.</p>
            <p>• Tres niveles de precio: retail, mayoreo, mínimo aceptable.</p>
            <p>• Redondeo configurable: entero, ×5 o ×10.</p>
            <p>• Perfiles de margen por canal de venta.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-primary" />Flujo Operativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Crear Orden de Compra con costo total real.</p>
            <p>2. Agregar items con especificaciones.</p>
            <p>3. Generar unidades individuales en inventario.</p>
            <p>4. Asignar costos de importación y reparación.</p>
            <p>5. Recalcular precios con perfiles de margen.</p>
            <p>6. Crear cotización → convertir a venta.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}