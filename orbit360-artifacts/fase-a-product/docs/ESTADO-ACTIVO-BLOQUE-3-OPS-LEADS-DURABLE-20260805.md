# ESTADO ACTIVO — BLOQUE 3.0 · OPS/LEADS DURABLE

Fecha local: 2026-08-05 06:38 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `OPS_LEADS_BACKEND_LAB_COMPLETE`  
Estado: `ACTIVE_IN_PARALLEL_WITH_MANUAL_VISUAL_REVIEW`

## Decisión de continuidad

La revisión visual manual no queda detenida por el modal `Acuerdos legales`.

La URL LAB retenida está disponible para Paula:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

El acuerdo legal no se desactiva globalmente. Debe aceptarse una sola vez en la sesión de revisión. El problema observado corresponde al capturador automático, que registró el overlay en las ocho rutas; no demuestra un defecto del producto.

## Estado técnico cerrado del Microbloque 2.5

```text
run: 31005103975
preflight canónico: 32/32 PASS
Functions allowlisted: 4/4
Hosting preview: retenido
integridad: PASS
snapshots before/after: idénticos
Firestore writes: 0
Auth writes: 0
pérdida de datos: no
```

## Decisión operativa

```text
manual review: AVAILABLE
manual review approval: PENDING
modal legal: NON_BLOCKING
captura automática: PENDING_CORRECTION
producto/backend: CONTINUE
```

No se requiere desactivar el contrato legal ni recapturar antes de continuar el trabajo técnico.

## Alcance activo del Bloque 3.0

Cerrar el backend durable de Ops/Leads reutilizando la infraestructura ya aprobada:

- Auth y membership existentes;
- multirol, rol activo y scopes;
- `Orbit.store` y write guards;
- Functions LAB ya desplegadas;
- URL Hosting ya retenida;
- snapshot e integridad existentes;
- gate y evidencia acumulativa de la RC.

## Frontera

```text
nuevo deploy Functions: no
nuevo deploy Hosting: no
nuevo request visual: no
repetición 18/18: no
usuarios o memberships sintéticos: no
Rules: no
reimportación: no
producción/main/merge: no
```

## Siguiente acción exacta

Reconciliar en modo source-only el contrato durable de Ops/Leads contra la Function allowlisted `orbit360OpsLeadsCommandLabV20260804`, el inbox de asesor, los owners de módulos y el ledger vigente. Identificar exclusivamente el delta durable faltante antes de cualquier autorización de escritura o runtime.

## Evidencia de decisión

```text
orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-manual-visual-review-nonblocking-v20260805.json
```
