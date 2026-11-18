/**
 * Pruebas de contrato comercial Nexora; lectura estática, sin datos reales.
 * Lee esquemas locales Sales/SaleItems/Quotes y backend convertQuoteToSale.
 * Escribe: nada. Protege persistencia de campos de conversión y RLS server-only.
 * Límite: esquema en archivos y forma del código no demuestran atomicidad ni API runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const schema = (name) => JSON.parse(readFileSync(new URL(`../base44/entities/${name}.jsonc`, import.meta.url), 'utf8'));
const conversion = readFileSync(new URL('../base44/functions/convertQuoteToSale/entry.ts', import.meta.url), 'utf8');
const gateway = readFileSync(new URL('../base44/functions/tenantData/tenant-access.mjs', import.meta.url), 'utf8');

test('comercial: Sales contiene campos que requiere conversión e idempotencia', () => {
  const props = schema('Sales').properties;
  for (const name of ['quote_id','sale_number','sale_date','customer_id','sale_type','cogs_total','gross_profit_total','gross_margin_percent','status','currency']) {
    assert.ok(props[name], `Sales.${name} ausente`);
  }
});

test('comercial: SaleItems congela costo y conserva referencia de unidad', () => {
  const props = schema('SaleItems').properties;
  for (const name of ['sale_id','inventory_unit_id','description','unit_price_sold','unit_cost_frozen','quantity','line_total','profit_amount']) {
    assert.ok(props[name], `SaleItems.${name} ausente`);
  }
});

test('comercial: Quotes registra progreso y referencia a venta', () => {
  const props = schema('Quotes').properties;
  for (const name of ['sale_id','converted_at','conversion_in_progress']) assert.ok(props[name], `Quotes.${name} ausente`);
  assert.equal(props.conversion_in_progress.type, 'boolean');
});

test('comercial: escrituras directas en entidades financieras están cerradas a navegador', () => {
  for (const entity of ['Sales','SaleItems','Quotes']) {
    const rls = schema(entity).rls;
    for (const action of ['read','create','update','delete']) {
      assert.equal(rls?.[action]?.user_condition?.role, '__server_only__', `${entity}.${action}`);
    }
  }
});

test('comercial: conversión mantiene contrato de idempotencia y costo histórico', () => {
  assert.match(conversion, /Sales\.filter\(\{ quote_id: quoteId \}/);
  assert.match(conversion, /unit_cost_frozen: unitCost/);
  assert.match(conversion, /total_real_unit_cost/);
  assert.match(conversion, /conversion_in_progress: true/);
  assert.match(conversion, /clientForRequest\(rawClient, req\)/);
});

test('onboarding P0: Suppliers pertenece al gateway tenant de servidor', () => {
  assert.match(gateway, /TENANT_ENTITIES=.*'Suppliers'/);
  const suppliers = schema('Suppliers');
  assert.ok(suppliers.properties.organization_id);
  assert.equal(suppliers.rls.create.user_condition.role, '__server_only__');
});
