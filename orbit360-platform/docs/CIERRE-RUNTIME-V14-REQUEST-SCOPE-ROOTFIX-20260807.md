# CIERRE RUNTIME V14 — REQUEST SCOPE ROOTFIX

Fecha: 2026-08-07  
Proyecto: Orbit 360 / A&S  
Rama canónica: `ays/backend-tenant-lab-v99-20260703`  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Request consumido: `20260807.14-two-phase-runtime`  
Run runtime: `31184472169`  
Run rootfix source-only: `31184969260`

## Resultado runtime v14

- Activación source-only v14: PASS.
- Transición explícita source → runtime-pending: PASS.
- Transporte por base SHA antes de secretos: PASS.
- Request exclusivo: 1 commit / 1 archivo: PASS.
- `GO_GATE_CONTRACT`: STOP antes de secretos.
- Clasificación inmediata: `DATA_CONTRACT_FAILURE`.
- Primer check real fallido: `requestScope`.
- Secretos leídos: 0.
- Firebase: 0.
- Firestore reads/writes: 0/0.
- Auth/operational writes: 0/0.
- Hosting restore/backup/deploy: 0/0/0.
- Navegador/precheck/matriz: 0/0/0.
- Producción/main/merge: 0.
- Request: consumido, congelado, no reutilizable.
- Rollback Hosting: no requerido porque Hosting no fue tocado.

## Causa raíz exacta

El request v14 omitió cinco invariantes que el engine canónico ya exigía dentro de `scope`:

1. `precheckRequiredBeforeMatrix: true`
2. `directionDesktop: true`
3. `operationalTablet: true`
4. `advisorMobile: true`
5. `viewportCaptureOnly: true`

El gate canónico actuó correctamente y detuvo la ejecución antes de secretos.

### Causa raíz profunda

`PIPELINE_MECHANISM_FAILURE / REQUEST_SCOPE_GUARD_DRIFT`.

El guard portable y sus fixtures source-only no exigían esos cinco campos. Por eso aceptaron un request incompleto que posteriormente el engine canónico rechazó. La falla no estaba en Auth, Cliente 360, Aseguradoras, datos A&S, navegador ni Hosting.

## Rootfix source-only

Se alineó `tools/orbit360-json-guard-visual-matrix-runtime-v20260806.mjs` con el contrato de `requestScope` del engine canónico.

Se ampliaron:

- `tools/orbit360-test-request-lifecycle-baseline-contract-v20260806.mjs`;
- `tools/orbit360-test-preflight-portable-source-v20260806.mjs`.

Los fixtures ahora contienen los cinco invariantes y prueban individualmente que la ausencia de cualquiera de ellos sea rechazada antes de runtime.

## Evidencia del rootfix

Run source-only: `31184969260`.

Resultado:

```text
Validate scope-aware guard and fixtures: PASS
Prove v14 root cause and no runtime side effects: PASS
```

Invariantes demostradas:

- guard y engine alineados en requestScope;
- cada uno de los cinco campos faltantes se rechaza antes de runtime;
- request v14 continúa consumido/frozen;
- secretos/Firebase/Hosting/browser/deploy/writes: 0.

## Estado metodológico

`STOP_RETRY` se mantiene para v14. No existe segundo intento runtime y no se reutiliza el request `20260807.14-two-phase-runtime`.

Una futura ejecución solo puede abrirse con request nuevo y autorización nueva después de que el paquete source-only completo valide el scope canónico.

## Impacto Claude / prototipo reutilizable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: los permisos de ejecución y el alcance funcional visible deben formar un contrato único; un request para una matriz multivista no puede declarar genéricamente “browser/matrix” y omitir las vistas o el precheck concretos.

No compartir con Claude: workflow GitHub, secretos, Firebase, canales LAB, hashes operativos ni implementación del guard.

## Impacto Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Agregar al contenido de gates/causa raíz:

- diferencia entre `DATA_CONTRACT_FAILURE` inmediato y `PIPELINE_MECHANISM_FAILURE` profundo;
- por qué un gate debe rechazar un request incompleto antes de secretos;
- cómo se evita que source-check y engine tengan contratos distintos;
- regla: si el request declara matriz Dirección/Operativo/Asesor, esas vistas y el precheck deben formar parte explícita del contrato.

## Siguiente acción exacta

Mantener runtime cerrado. Integrar este rootfix source-only al HEAD canónico y actualizar el estado vivo de PR #5. No crear request v15 ni solicitar otra ejecución hasta que exista una autorización nueva; cuando exista, el request deberá incluir el scope canónico completo y pasar el guard antes del gate.
