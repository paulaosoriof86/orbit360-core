# Orbit 360 — Go-live y continuidad de datos A&S — 2026-08-12

## Propósito

Este contrato evita que la primera salida a producción convierta las siguientes cargas o desarrollos en nuevas migraciones destructivas. Desde el go-live, producción es el sistema operativo de registro y ningún deploy de código puede reseedear, reemplazar o reconstruir la base productiva.

## 1. Corte inicial y datos de CRM creados después de la última actualización

Antes de cualquier mutación productiva se obtiene un snapshot/backup del destino y se calcula un delta desde el último watermark/corte conocido hasta el momento de activación. El delta se procesa por identificadores estables, timestamps y procedencia; no se hace una recarga completa.

El orden obligatorio es: `snapshot destino -> leer origen autorizado -> calcular delta -> dry-run -> diff -> conflictos -> aprobación del bloque -> escritura incremental idempotente -> auditoría -> smoke -> rollback disponible`.

Si un dato productivo ya existe y es más nuevo o fue creado/modificado por un usuario en producción, el importador no lo sobreescribe silenciosamente. Debe conservarlo o elevar un conflicto con diff. Después del go-live, producción prevalece como sistema de registro operativo.

## 2. Nuevas planillas de comisiones

Cada archivo nuevo de `planilla_comisiones` entra como un batch independiente e inmutable con hash/fingerprint, aseguradora, país, moneda, período, archivo, hoja, fila/bloque y fecha de ingestión. Se perfila, mapea, normaliza y deduplica antes de proponer escrituras.

El dry-run clasifica `crear / actualizar / omitir / REQUIERE_VALIDACION`. Las comisiones se relacionan con la prima neta recaudada y con sus fuentes válidas; el archivo no puede reconstruir clientes, pólizas ni cobros desde inferencias. Reimportar el mismo batch debe ser idempotente y no duplicar registros. Todo batch conserva auditoría y rollback.

Estas planillas nuevas NO se mezclarán con el deploy inicial de go-live. Se procesarán inmediatamente después como bloque de datos separado, o antes solo mediante una autorización de datos independiente que no amplíe el deploy.

## 3. Nuevos estados de cuenta bancarios

`estado_cuenta_bancario` nunca escribe directamente `cobros_realizados`. El banco entra primero a staging/conciliación como movimientos identificados por fingerprint. El sistema propone coincidencias usando únicamente campos permitidos como fecha, importe, referencia, cliente/póliza cuando exista evidencia y moneda/país.

Una coincidencia confirmada puede vincularse al cobro correspondiente; una transacción no conciliada permanece pendiente o `REQUIERE_VALIDACION`. No se crean cobros por inferencia desde el banco. Reimportar el mismo estado no duplica movimientos ni conciliaciones.

## 4. Regla permanente para nuevas fuentes

Cada fuente mantiene su carril independiente: `perfilado -> mapeo -> dry-run -> diff -> validación -> escritura -> auditoría -> smoke -> rollback`. Falta de país o moneda se clasifica `REQUIERE_VALIDACION`; GT usa GTQ y CO usa COP salvo fuente válida que indique otra moneda.

No se mezclan cargas: clientes, aseguradoras, pólizas, vehículos, cobros_realizados, planilla_aseguradora, planilla_comisiones, estado_cuenta_bancario, financiero_historico, siniestros, documentos_soporte y configuracion_catalogo conservan procedencia y reglas propias.

## 5. Producción después del go-live

Producción es acumulativa. Los usuarios continúan creando clientes, gestiones, leads, operaciones, asignaciones y otros datos autorizados. Los importadores posteriores complementan o proponen cambios; nunca reemplazan la base completa.

Cada batch registra `batchId`, source fingerprint, watermark, estado `pending/synced/failed`, antes/después, actor/autorización, timestamps y rollback. Los conflictos se resuelven campo a campo. Las escrituras deben ser idempotentes y reanudables.

## 6. Cómo se incorporan módulos nuevos sin afectar datos existentes

Un módulo nuevo no se habilita en producción por copiar archivos y mucho menos por reseedear la base. Se usa evolución compatible:

`LAB gate -> migración dry-run si hace falta -> backup/rollback -> deploy compatible -> smoke productivo read-only -> habilitación por configuración del tenant -> smoke post-habilitación`.

Los cambios de esquema siguen el patrón `expand -> backfill compatible -> convivencia de lectura -> switch -> retirar lo viejo solo cuando ya no tenga consumidores`. Primero se agregan campos/colecciones compatibles; no se renombran o eliminan campos productivos en el mismo release en que se introduce su reemplazo.

El rollback de código no borra datos válidos creados en producción. Si una migración de datos es necesaria, usa su propio batch/auditoría/rollback y no queda escondida dentro del deploy de frontend.

## 7. Feature flags/configuración por tenant

Los módulos nuevos pueden desplegarse inicialmente oscuros/inactivos. Solo después del gate y smoke se habilitan para `alianzas-soluciones` mediante configuración, sin hardcode A&S en módulos genéricos. Esto permite liberar código sin exponer una función incompleta y permite rollback por configuración cuando corresponda.

## 8. Primera salida productiva

La primera autorización productiva cubre un único macrobloque y un request inmutable. Antes de secretos se ejecuta el preflight/gate canónico. Antes de cualquier write se exige backup del destino y rollback ejecutable. Antes de deploy se exige checkpoint recuperable del Hosting. Después del deploy se ejecuta smoke en Dirección desktop, Operativo tablet y Asesor móvil y se confirma integridad.

Si la misma etapa o familia de fallo reaparece dos veces se activa `STOP_RETRY`: no hay tercer request, no se usa producción para depurar el validator y se diagnostica causa raíz fuera de producción.

## 9. Fuera del macrobloque de go-live

Las nuevas planillas de comisiones y estados de cuenta recibidos después del último corte se conservan para el siguiente bloque incremental. `financiero_historico` permanece congelado/post-producción. Cotizador/Comparativo/Renovaciones, Marketing, Portal y demás módulos siguen su propio gate posterior y no retrasan la primera salida.
