/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Inicializa el SDK Base44 compartido por pantallas y servicios.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
import { createClient } from '@base44/sdk';
import {createTenantBridge} from './tenantBridge.mjs';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const rawBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// UI selection is untrusted; tenantData resolves authority in server storage.
export const base44=createTenantBridge(rawBase44,()=>sessionStorage.getItem("nexora.organization")||null);
