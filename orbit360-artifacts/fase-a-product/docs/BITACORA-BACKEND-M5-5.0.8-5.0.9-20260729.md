# Bitácora backend — M5 5.0.8 y 5.0.9

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala

## Bloque

Runtime smoke LAB de la RC `b25bf275…`, stop-line, diagnóstico de causa raíz y remediación estática con nueva RC `f6dfa37e…`.

## Carriles

- **A — frontend/UX/Academia:** owner estático instalado antes del store LAB, seed y addenda.
- **B — backend/seguridad:** snapshots read-only, cero escrituras; normalizador reusable de evidencia; store y loader protegidos intactos.
- **C — datos reales:** 414 clientes, 26 aseguradoras, 7 asesores y destino canónico 1/1/414/26 preservados.

## Avance visible

1. Package 5.0.8 cerró verde.
2. Runtime 5.0.8 se ejecutó exactamente una vez.
3. Snapshots antes/después demostraron conteos y digests idénticos.
4. Se separaron un falso negativo del validador y un defecto funcional de orden de carga.
5. No se repitió el navegador.
6. Se corrigió `index.html` sin tocar el adaptador Firestore.
7. Se añadió owner normalizado para evidencia string/objeto.
8. Gate 5.0.9 cerró verde y generó RC `f6dfa37e…`.

## Fuente/base

- Hosting 5.0.7: paridad 25/25 de RC `b25bf275…`.
- Runtime package: run `30420595908`.
- Runtime request: run `30420738744`, artifact `8711820943`.
- Cierre stop-line: `m5-runtime-smoke-508-attempt-closure.json`.
- Static remediation: run `30421741635`, artifact `8712155374`.

## Diagnóstico

### Evidencia de bootstrap

- Necesidad: reconocer scripts owners desde CDP.
- Esperado: filas string y `{path}` equivalentes.
- Causa: productor y consumidor usaban representaciones distintas.
- Fix: `orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs` normaliza durante toda la espera.
- Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.

### Academia / orden del store

- Necesidad: cargar contenido versionado sin llamadas durables automáticas.
- Esperado: owner activo antes de `Orbit.store = api`.
- Causa: el owner se inyectaba tarde desde el addendum.
- Evidencia: intentos rechazados en `lecciones`, `evaluaciones` y `config`; cero cambios durables.
- Fix: owner entre `data/store.js` y `store-firestore-lab.local.js`.
- Clasificación: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`.

### Gate anterior

- Necesidad: comprobar orden runtime real.
- Causa: 5.0.6 validaba texto dentro del addendum, no `index.html`.
- Fix: fixture de asignación real y contrato owner → adaptador → seed/Academia.
- Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.

## Implementación

- `orbit360-platform/index.html`.
- `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs`.
- `tools/orbit360-m5-academia-static-bootstrap-load-order-fixture-v20260729.mjs`.
- `tools/orbit360-m5-bootstrap-evidence-normalizer-fixture-v20260729.mjs`.
- Control-plane y gate 5.0.9.

No se modificaron:

- `data/store-firestore-lab.local.js`;
- `core/backend-lab-loader.js`;
- Firebase Rules;
- Functions;
- datos reales.

## Pruebas/evidencia

```txt
Runtime preflight: 15/15
Runtime contract: 37/37
Snapshots: 11/11 + 11/11
Firestore writes: 0
Operational writes: 0
Static preflight: 15/15
Static contract: 40/40
Load-order fixture: 19/19
Normalizer fixture: 7/7
```

## Estado

```txt
RC anterior: b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
RC nueva: f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
Critical assets: 42/42
LAB: 24/25
Mismatch: index.html
```

## Acumulado Claude

- Orden de carga del owner: `REPLICABLE_CLAUDE_ACUMULADO`.
- Normalización de contratos de evidencia: `REPLICABLE_CLAUDE_ACUMULADO`.
- Workflows, Firebase, snapshots y gates: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Impacto Academia

Actualizar en la siguiente iteración acumulada:

- contenido estático vs progreso durable;
- orden de carga como parte del contrato;
- Rules rechazando un intento no elimina la necesidad de corregir la causa;
- defecto funcional vs validador obsoleto.

## Pendiente

Hosting LAB de la RC `f6dfa37e…` requiere autorización independiente. Runtime, revisión visual y Pólizas están bloqueados.

## Siguiente acción exacta

Una única entrega Hosting LAB de la nueva RC, seguida de paridad 25/25. Después, y solo después, solicitar un nuevo runtime smoke separado que use el owner normalizado.
