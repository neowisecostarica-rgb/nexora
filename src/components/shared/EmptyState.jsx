import React from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyState({ icon: Icon = Package, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-muted mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">{actionLabel}</Button>
      )}
    </div>
  );
}