/** API de lectura Consulting: autoridad de membresías y grants siempre en servidor. */
import {createClientFromRequest} from 'npm:@base44/sdk@0.8.25';
import {handlePartnerOverview} from './handler.mjs';
Deno.serve(async req => {
  try {
    if (req.method !== 'POST') return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405});
    let input;
    try { input=await req.json(); } catch { return Response.json({error:'INVALID_JSON'},{status:400}); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return Response.json({error:'INVALID_JSON'},{status:400});
    const result=await handlePartnerOverview(createClientFromRequest(req),input);
    return Response.json(result.body,{status:result.status});
  } catch {
    return Response.json({error:'PARTNER_OVERVIEW_FAILED'},{status:500});
  }
});
