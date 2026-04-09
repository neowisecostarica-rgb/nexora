import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Limpia locks de conversión huérfanos (conversion_in_progress = true por más de 10 min).
// Invocado por automatización programada cada 15 minutos.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const lockedItems = await base44.asServiceRole.entities.PurchaseItems.filter({
    conversion_in_progress: true
  });

  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const now = new Date();
  let cleaned = 0;

  for (const item of lockedItems) {
    const updatedAt = new Date(item.updated_date || item.created_date);
    const ageMs = now - updatedAt;

    if (ageMs > TEN_MINUTES_MS) {
      await base44.asServiceRole.entities.PurchaseItems.update(item.id, {
        conversion_in_progress: false
      });
      cleaned++;
    }
  }

  return Response.json({ success: true, locks_cleaned: cleaned, total_checked: lockedItems.length });
});