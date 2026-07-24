# Diagnóstico estático de causa raíz M2 — VALIDATOR_STALE

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.1`  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Antecedente

La ejecución única `30103556811` confirmó el proyecto Firebase existente, la configuración web, Auth y una membership elegible. El bootstrap canónico no llegó a estado listo y el store no fue instalado. La autorización quedó consumida y no se permite reintento.

## Evidencia estática vinculante

La identidad canónica del LAB se encuentra declarada por el owner vigente y por Firestore Rules. El contrato productivo anterior incluía el correo de esa identidad entre los marcadores demo prohibidos y generaba `auth_demo_no_permitido`.

El orden del bootstrap demuestra que `backendProductReadinessP0.readiness` se evalúa antes de `_attachSnapshots`. Por tanto, el fallo de snapshots no puede ser la primera causa cuando readiness bloquea esa identidad.

## Clasificación

```text
Clasificación vinculante: VALIDATOR_STALE
Causa raíz: AUTH_DEMO_MARKER_REJECTED_AUTHORIZED_EXISTING_IDENTITY
Brecha secundaria: PIPELINE_MECHANISM_FAILURE
```

La brecha secundaria corresponde a la evidencia del primer runtime, que no preservó fase, errores de readiness ni estado de snapshots.

## Corrección fail-closed

El validador genérico conserva el bloqueo demo por defecto. Una identidad con marcador demo solo puede superar readiness cuando el descriptor runtime prueba simultáneamente:

- transición controlada de identidad existente;
- proyecto existente previamente reconciliado;
- tenant derivado únicamente desde membership;
- modo read-only;
- escrituras desautorizadas.

Si falta una condición, se mantienen `auth_demo_no_permitido` y `transicion_identidad_existente_incompleta`. No se incorporó tenant, UID, correo ni configuración A&S en el owner genérico.

## Cobertura de evidencia corregida

Una futura ejecución, únicamente con nueva autorización, conservará sanitizados:

- fase del bootstrap;
- errores del bootstrap;
- estado y errores de readiness;
- estado del store;
- claves de errores de snapshots;
- colecciones denegadas;
- aceptación de la identidad existente controlada.

## Seguridad

```text
Secretos accedidos: no
Firebase accedido: no
Firestore leído: no
Runtime ejecutado: no
Rules modificadas: no
Escrituras de configuración: 0
Escrituras operativas: 0
Hosting/Functions: no
Importaciones: no
Pólizas/M3: no
Merge/main: no
```

## Siguiente frontera

Cerrar el gate estático con evidencia sanitizada `ok:true`. Solo después podrá evaluarse una nueva autorización única del runtime corregido. No se autoriza automáticamente ninguna ejecución externa.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: actualizar diferencia entre defecto de datos y validador obsoleto, además de la obligación de preservar códigos sanitizados de diagnóstico.
