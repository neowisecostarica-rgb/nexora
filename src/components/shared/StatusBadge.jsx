import React from "react";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  draft: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Borrador" },
  purchased: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Comprado" },
  in_transit: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "En Tránsito" },
  received: { bg: "bg-green-500/10", text: "text-green-500", label: "Recibido" },
  closed: { bg: "bg-purple-500/10", text: "text-purple-500", label: "Cerrado" },
  available: { bg: "bg-green-500/10", text: "text-green-500", label: "Disponible" },
  reserved: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Reservado" },
  quoted: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Cotizado" },
  sold: { bg: "bg-purple-500/10", text: "text-purple-500", label: "Vendido" },
  warranty: { bg: "bg-orange-500/10", text: "text-orange-500", label: "Garantía" },
  damaged: { bg: "bg-red-500/10", text: "text-red-500", label: "Dañado" },
  planning: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Planeación" },
  shipped: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Enviado" },
  in_customs: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "En Aduana" },
  delivered: { bg: "bg-green-500/10", text: "text-green-500", label: "Entregado" },
  sent: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Enviada" },
  approved: { bg: "bg-green-500/10", text: "text-green-500", label: "Aprobada" },
  rejected: { bg: "bg-red-500/10", text: "text-red-500", label: "Rechazada" },
  expired: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Expirada" },
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Pendiente" },
  completed: { bg: "bg-green-500/10", text: "text-green-500", label: "Completada" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-500", label: "Cancelada" },
  refunded: { bg: "bg-orange-500/10", text: "text-orange-500", label: "Reembolsada" },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: "bg-gray-500/10", text: "text-gray-500", label: status };
  return (
    <Badge variant="secondary" className={`${style.bg} ${style.text} border-0 font-medium text-xs`}>
      {style.label}
    </Badge>
  );
}