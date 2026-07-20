# Incidente importador — aseguradoras pendientes de validación

Fecha: 2026-07-14  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carril: C con guardas B

## Evidencia

Al seleccionar `CARGA-INICIAL-AYS-LAB-SANITIZADA-20260714.json`, el cargador rechazó el archivo por ocho registros de aseguradoras con `requiereValidacion=true`.

## Causa raíz

El importador trataba una alerta de calidad de aseguradora como error estructural del archivo. Además, durante el armado del lote reemplazaba el estado pendiente por `validado`.

## Corrección

- Las aseguradoras canónicas con datos pendientes ya no invalidan el archivo.
- Conservan `requiereValidacion=true`, `validationStatus=requiere_validacion` y su motivo.
- Se cargan como directorio restringido.
- Quedan deshabilitadas para vinculación, tarifas, Cotizador y Comparativo hasta validarse.
- Una cuarentena explícita o coincidencia ambigua sí bloquea el dry-run.
- El resumen diferencia `Aseguradoras pendientes` de `Bloqueos`.
- Se renovó la versión del recurso para evitar caché anterior.

## Archivos

- `orbit360-platform/modules/importar-initial-tenant-lab.js`
- `orbit360-platform/core/backend-lab-init.js`
- `tools/orbit360-test-import-initial-pending-insurers.mjs`
- `.github/workflows/orbit360-ays-lab-preview.yml`

## Validación

- Sintaxis JavaScript: PASS.
- Prueba dinámica de aseguradora pendiente: PASS.
- La advertencia permanece y las capacidades quedan restringidas: PASS.
- Prueba de cuarentena explícita: PASS; bloquea el lote.
- El archivo de datos no fue modificado.

## Commits

- `f6bbfff68c9163c2664c42b0b61dc25441c65dcc`
- `19c54e8ac08e90b959f9c367b6cf245ff3859bd3`
- `2154dfd0ace1cb87ba0ead816bfdd0d31145556d`
- `ce071180b67c025a8b7bddda88136d73ddb08a03`

## Rollback

Revertir estos commits en orden inverso únicamente ante una regresión demostrada. No modificar datos ya escritos ni otros componentes protegidos.

## Aplicación a Claude y Academia

Patrón reusable: separar `bloqueo que impide escritura` de `registro cargable con calidad pendiente y capacidades restringidas`. Academia debe explicar que una entidad pendiente puede entrar al directorio sin habilitar funciones operativas sensibles.

## Reapertura acotada — 2026-07-20

La aceptación técnica sintética no sustituye la aceptación de datos reales. Antes del Bloque 2 se debe probar desde la plataforma la carga directa de los directorios GT y CO, con diff por aseguradora, escritura controlada, lectura posterior, confirmación de accesos protegidos, auditoría, rollback y matriz final de completitud.
