# Bloque 1 — STOP THE LINE por omisión de owners en overlay 1.0.35

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Estado vinculante

```txt
STOP_THE_LINE_PREFLIGHT_OWNER_REGISTRY_RECONCILIATION_REQUIRED
```

No se autoriza un tercer preflight, deploy, navegador ni gate runtime.

## Primera ejecución estática 1.0.35

```txt
Run: 29881901498
Artifact: 8515080227
Digest: sha256:2833e2a425269376fd48eb938234b3a0c279f4ea4e943e94351b91c20f30e385
HEAD: 009d7c29401af67194e7331f104e6b7942111fce
Status: VALIDATOR_STALE
Checks: 1120/1126
```

Los seis fallos pertenecían al contrato base antiguo del ejecutor runtime:

```txt
contractVersion 1.0.25
WATCHDOG_BUDGET_MS sin espacios
OBSERVER_CAPTURE_TIMEOUT_MS sin espacios
literales compactos de failureStage/watchdog
```

No existía defecto funcional. Se reemplazó solo ese contrato en el overlay.

## Segunda ejecución estática 1.0.35

```txt
Run: 29882121307
Artifact: 8515159061
Digest: sha256:c6e4c3ce786ed79f482a5a5ea59eb9ce3d5b08f2cfacdcfe0c64f5217ca5e56f
HEAD: 9ea4d719fb7986d462aec9bb0c6ced4cb38e29bc
Status: VALIDATOR_STALE
Checks: 1099/1102
```

Los únicos tres fallos fueron:

```txt
OWNER_TOKEN:insurerSecureTargetBridge:version: '20260720.1'
OWNER_TOKEN:insurerSecureTargetBridge:noProtectedValueAccess: true
OWNER_TOKEN:realInsurerDirectoryAcademy:version:'1.221'
```

## Causa raíz

El overlay 1.0.35 fue simplificado para sustituir el contrato obsoleto del ejecutor y registrar el manifiesto crítico. Al hacerlo, omitió volver a declarar dos overrides de owner que sí existían en el overlay 1.0.34:

```txt
insurerSecureTargetBridge
realInsurerDirectoryAcademy
```

El validador volvió entonces a heredar los tokens antiguos del registro base. Esto explica por qué:

- los activos críticos nuevos aprobaron sus tokens;
- el contrato runtime corregido aprobó;
- solo fallaron tres tokens ajenos al manifiesto y al producto;
- no se alcanzó la etapa de validación estática local del manifiesto.

Clasificación:

```txt
VALIDATOR_STALE
PIPELINE_MECHANISM_FAILURE
```

No es:

```txt
FUNCTIONAL_DEFECT
DATA_CONTRACT_FAILURE
ENVIRONMENT_FAILURE
SECURITY_FAILURE
```

## Regla de repetición aplicada

La etapa `Preflight vinculante · contrato final` falló dos veces consecutivas.

Por tanto:

```txt
DETENER REINTENTOS
NO CREAR OTRO PARCHE
NO MODIFICAR PRODUCTO
NO EJECUTAR OTRO PREFLIGHT
NO ABRIR NAVEGADOR
```

## Estado del producto y datos

La falla no invalida:

- manifiesto de nueve activos críticos;
- verificador multiactivo;
- release `block1-critical-runtime-20260721-4`;
- barrera visual 20260721.4;
- Router y cache-busters 20260721.4;
- PWA/Service Worker 20260721-4;
- Academia 1.225;
- prueba idempotente 27/27;
- recuperación de datos.

```txt
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias históricas: 91
Credenciales: 26
Colombia: intacta
Firestore writes: 0
Vault reads: 0
Deploy: 0 en ambos preflights
Producción: intacta
```

## Siguiente acción exacta permitida

Solo diagnóstico/reconciliación estática, sin ejecución:

1. comparar registro base, extensiones y overlay 1.0.34/1.0.35 owner por owner;
2. construir una tabla única de owners efectivos;
3. demostrar que ningún override vigente se pierde al actualizar contrato;
4. preparar un único cambio atómico de registro/overlay;
5. revisar conjuntamente preflight, workflow, documentación, Claude y Academia;
6. solicitar una nueva autorización separada antes de cualquier ejecución.

No se aplicará ese cambio dentro de este mismo ciclo de dos fallos.

## Impacto Claude / prototipo

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Aprendizaje reusable: al simplificar un contrato versionado no se pueden perder overrides de owners no relacionados. Debe existir una reconciliación efectiva base + extensiones + overlay antes de ejecutar.

## Impacto Academia

Mantener la enseñanza de:

- diferencia entre defecto funcional y validador obsoleto;
- regla de dos fallos;
- owners efectivos y herencia de contratos;
- por qué un error del registro no se corrige tocando UX, datos ni backend.
