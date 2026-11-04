/**
 * Propósito: endpoint HTTP del CRUD empresarial. No acepta identidad ni rol del cliente.
 * Delegación: handleTenantData y tenant-access locales. Excepciones se reducen a códigos.
 */
import {createClientFromRequest} from 'npm:@base44/sdk@0.8.25';
import {handleTenantData} from './handler.mjs';
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405});
  let input;try{input=await req.json();}catch{return Response.json({error:'INVALID_JSON'},{status:400});}
  if(!input||typeof input!=='object'||Array.isArray(input))return Response.json({error:'INVALID_JSON'},{status:400});
  const result=await handleTenantData(createClientFromRequest(req),input);
  return Response.json({result},{status:200});
 }catch(e){
  const status=Number.isInteger(e?.status)&&e.status>=400&&e.status<500?e.status:500;
  return Response.json({error:status===500?'DATA_OPERATION_FAILED':e.code||'ACCESS_DENIED'},{status});
 }
});
