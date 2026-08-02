# CIERRE DE CAUSA RAÍZ — GATE 7.11 / OPS WORKFLOW BRIDGE

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block7-canonical-runtime-cumulative-visual-lab-v20260801`  
Clasificación definitiva: `VALIDATOR_STALE`

## 1. Necesidad

Cerrar estáticamente la revisión release-critical del Gate 7.11 para una sola candidata acumulativa de CRM, Ops y Leads, manteniendo Academia como integridad estática obligatoria pero contenido runtime no bloqueante para esta salida.

## 2. Esperado

El validador debía confirmar que el bridge operativo:

- reutiliza `Orbit.ciclo` y `Orbit.store`;
- incorpora solicitudes de emisión en la columna `Emisiones`;
- no crea colección, store, listener Firestore ni caché paralela;
- conserva owner y orden de carga existentes;
- no modifica producto durante la preparación source-only.

## 3. Evidencia del fallo

Ejecución: `30771793126`  
Job: `91560080475`  
Artifact: `8840747763`  
Digest artifact: `sha256:629fc01acead21af7d9f1f6891b9e083b34300fc1cbb486fc8dd5d59ac134a54`

Resultado:

```text
checks: 37/38 PASS
failedCheck: OPS_WORKFLOW_BRIDGE
product freeze: PASS
runtime/browser: no ejecutados
Firestore reads/writes: 0/0
operational writes: 0
Hosting/deploy/production: no
```

## 4. Causa raíz

El owner vigente es funcional y contiene:

```js
const col = board.find(c => c && c.def && c.def.nombre === 'Emisiones');
```

El validador exigía una cadena literal ligada al nombre local de variable:

```text
col.def.nombre === 'Emisiones'
```

Por tanto, rechazó código correcto porque el predicado dentro de `find()` usa `c.def.nombre`. La aserción evaluaba una decisión de estilo interna, no el contrato semántico. No existe evidencia de defecto en Ops, Leads, `Orbit.ciclo`, el bridge o el producto acumulativo.

## 5. Corrección

Archivo corregido:

`tools/orbit360-validar-gate711-release-critical-static-v20260802.mjs`

Commit:

`de9b8b7c73c6558e3c05f7836b79979ec99e11a1`

La aserción ahora verifica semánticamente:

- `workflowType === 'issuance_request'`;
- cualquier acceso `.def.nombre === 'Emisiones'`, sin depender del nombre de la variable local;
- `Orbit.store.get`;
- marca idempotente `C.__opsWorkflowsV1201`.

No se modificó ningún archivo de producto, dato, store, backend protegido, auth, módulo, estilo o `index.html`.

## 6. Impacto

- Producto acumulativo: sin cambio.
- Candidata canónica: preservada en `997fca628f95dd397dba347700a6bc644fe840f0`.
- Academia: continúa presente; su contenido completo no bloquea este release.
- Cloud/Claude: no enviado.
- Datos reales/secretos: no utilizados ni expuestos.
- Seguridad: sin ampliación de capacidades.
- Reintentos: la corrida fallida quedó consumida; no se reproduce. Se permite una sola ejecución correctiva estática con lifecycle y request nuevos.

## 7. Sincronización transversal

- `REPLICABLE_CLAUDE_INMEDIATO`: los validadores deben comprobar contratos semánticos, no nombres locales de variables.
- `ACADEMIA_ACTUALIZAR`: enseñar la diferencia entre defecto funcional, validador obsoleto y fallo del pipeline.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: workflow, requests, lifecycle y referencias de ejecución no viajan al paquete externo.
- `TEMPORAL_RETIRO`: el focused runtime de Academia no vuelve al camino crítico de CRM/Ops/Leads.

## 8. Estado

`VALIDATOR_STALE_CORRECTED / PRODUCT_FROZEN / STATIC_CORRECTIVE_READY_ONCE`

La siguiente acción es ejecutar una sola validación estática correctiva observable. Si reaparece `OPS_WORKFLOW_BRIDGE` o la misma familia de fallo, aplica `STOP_RETRY` inmediato y no se crea otro parche ni otra corrida.
