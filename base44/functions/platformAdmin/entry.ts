/**
 * Propósito: frontera HTTP del panel de plataforma.
 * Dependencia: SDK autenticado y handler local. No confía en roles recibidos del cliente.
 * Efectos: definidos por acción del handler; errores internos no se envían al navegador.
 */
import {createClientFromRequest} from 'npm:@base44/sdk@0.8.25';
import {handlePlatformAdmin} from './handler.mjs';
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405});
  let input;
  try{input=await req.json();}catch{return Response.json({error:'INVALID_JSON'},{status:400});}
  if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'INVALID_JSON'},{status:400});
  const result=await handlePlatformAdmin(createClientFromRequest(req),input);
  return Response.json(result.body,{status:result.status});
 }catch{
  // A write may already have happened if final audit failed: never automatically retry.
  return Response.json({error:'PLATFORM_ACTION_FAILED',message:'No se pudo completar la acción. Actualizá la vista antes de reintentar.'},{status:500});
 }
});
