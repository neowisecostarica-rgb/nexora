# Nexora — datos de prueba y configuración fija
Fecha: 2026-10-21. Estado: revisión estática; sin limpieza ni migración de datos.

## Evidencia y límites
Gustavo indica que los registros probablemente son pruebas y algunos valores están hardcodeados. Esto no certifica que cada registro sea ficticio. No asignar automáticamente esos datos a Consulting, a un cliente ni a Gustavo como dueño.

El Dashboard consulta InventoryUnits, Sales y PurchaseOrders mediante SDK. Sus tarjetas no son, por ese hecho, datos de muestra escritos en el componente. Las consultas tienen límites y no certifican totales completos. Una búsqueda de mock/dummy/fixture/sample/demo/hardcod en src no encontró un dataset explícito; esto no descarta otras formas de datos de prueba.

## Inventario de configuración
| Fuente | Valor fijo observado | Tratamiento previsto |
| --- | --- | --- |
| src/components/layout/Sidebar.jsx | TecnoUsados / TecnoUsados OS v1.0 | Identidad Nexora y empresa seleccionada; preservar navegación |
| src/pages/ImportBatches.jsx y base44/entities/ImportBatches.jsonc | USA → Mexico | Países por operación con defaults configurables por empresa |
| src/pages/Purchases.jsx y base44/entities/PurchaseOrders.jsonc | USD/MXN, Shipping USA, Tax USA | Monedas configurables y etiquetas neutrales; preservar campos históricos |
| src/lib/formatters.js | en-US, es-MX, moneda predeterminada USD | Locale y moneda de empresa/usuario; sin convertir importes implícitamente |
| src/lib/categoryConfig.js | laptops, smartphones, monitors, sneakers | Preservar plantillas; extender catálogo configurable multicategoría |

## Secuencia de implementación y aceptación
1. Cerrar MG01 con pruebas API reales entre dos empresas, revocación, acceso directo y archivos. Los mocks actuales no lo certifican.
2. Inventariar registros persistidos por entidad y ownership, con conteos y referencias; exportar respaldo protegido antes de cualquier limpieza. Clasificar como confirmado prueba / confirmado real / pendiente. No inferir por nombre, monto ni ausencia de organization_id.
3. Añadir preferencias de empresa para locale, moneda base y países predeterminados, con validación de servidor y edición autorizada. Mantener fallback compatible con datos históricos; las listas concretas de idiomas y monedas siguen por confirmar.
4. Conectar formularios y formatos a preferencias; permitir moneda original por documento. Nunca sumar monedas diferentes como una sola ni presentar formato como conversión FX. No recalcular costos históricos al cambiar preferencias.
5. Extender categorías y atributos sin renombrar claves históricas; alimentos/cosméticos/perfumes requieren definir campos y requisitos, sin prometer cumplimiento regulatorio automático.
6. Preparar demostración aislada para Consulting y un importador; etiquetar datos demo. Limpieza/migración queda como cambio separado, con alcance explícito y reversión verificada.

## Preservación
No borrar registros en esta etapa. No ejecutar seeds en producción, reactivar cron, enviar invitaciones, integrar ni publicar. No añadir banderas demo a entidades sin contrato y aplicación consistente. Gustavo sigue siendo Super Admin de plataforma.

## Checkpoint
Documento añadido al PR #3. La revisión identifica dependencias del siguiente bloque; no declara implementadas preferencias, i18n completo, FX, categorías adicionales ni clasificación de registros persistidos.
