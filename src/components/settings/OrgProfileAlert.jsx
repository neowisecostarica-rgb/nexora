import React from "react";
import { AlertTriangle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function OrgProfileAlert({ missing = [] }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-yellow-800">Perfil de empresa incompleto</p>
        <p className="text-yellow-700 mt-0.5">
          Para crear cotizaciones y ventas debes completar: <strong>{missing.join(", ")}</strong>.
        </p>
      </div>
      <Link to="/settings">
        <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-100">
          <Settings className="w-3.5 h-3.5 mr-1" />Configurar
        </Button>
      </Link>
    </div>
  );
}