# Gate 7.11 — referencia vigente

Fecha: 2026-08-02

Leer en este orden:

1. `CIERRE-CAUSA-RAIZ-ACADEMIA-SESSION-WRITES-GATE711-20260802.md`
2. `CIERRE-STOP-RETRY-GATE711-MACRO-LIFECYCLE-REGISTRY-20260802.md`
3. `ACADEMIA-CAUSA-RAIZ-SESSION-WRITES-IDEMPOTENCIA-20260802.md`
4. `CLAUDE-ROOTFIX-IDEMPOTENT-STATIC-CONTENT-SESSION-20260802.md`
5. `CIERRE-STOP-RETRY-GATE711-BROWSER-WRITE-ATTEMPT-20260802.md`

## Estado

```text
CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_STOP_RETRY
ROOT_CAUSE_FIXED_STATICALLY_RUNTIME_VERIFICATION_PENDING
```

## Causa raíz funcional

```text
Owner: orbit360-platform/data/academia-v1230-operational-directory-v20260722.js
Función: apply
Trigger inválido: orbit:session
Root fix: fd49e1b15e69d1f023727b4ff92190852bcae1e0
```

El listener de sesión que reejecutaba cinco mutaciones de Academia por cada rol fue eliminado. El contenido 1.232 se conserva y la prueba sintética demuestra cero llamadas adicionales en Dirección, Operativo y Asesor.

## Evidencia funcional vigente

```text
Diagnóstico exacto:
run 30762248796 · 15 intentos bloqueados

Academia idempotente:
run 30762515438 · 16/16 PASS

Manifiesto acumulativo:
run 30762785016 · 10/10 PASS

Identidad efímera reusable:
14/14 PASS

Readiness integral original:
run 30763065758 · 12/12 PASS
```

## Macro-bloque autorizado a las 14:37

```text
Run: 30766141784
Job: 91545118385
Artifact: 8838994045
Digest: sha256:53cdf4c449d82e1853cdaac7960869ebfd7219f2b91c39855cbb483a14da6ac3
```

Resultado:

```text
classification: VALIDATOR_STALE
stage: preflight_before_secrets
failedCheck: LIFECYCLE_MATCHES_LEDGER
```

El macro se detuvo antes de secrets, Firestore, dependencias y navegador. No se ejecutó la verificación focalizada ni el Gate 7.11 completo.

## Causa del preflight y correctivo

El readiness tenía codificada la ruta de un lifecycle histórico cerrado. Ahora utiliza el registro activo:

```text
tools/orbit360-gate711-rootfix-lifecycle-registry-v20260802.json
```

Evidencia del correctivo:

```text
Run: 30766213542
Job: 91545306596
Artifact: 8839016087
Digest: sha256:53b86815827caed22436bda9e16511ce182b261f2d6edc0d917482cfdc8d92e7
Status: GATE711_ROOTFIX_STATIC_READINESS_PASS
Checks: 12/12
```

No usó secrets, Firestore, runtime ni navegador y produjo cero escrituras.

## Seguridad y replay

```text
Macro workflow: cerrado
Static corrective workflow: cerrado
Macro request: consumido
Static request: consumido
Autorizaciones activas: 0
Runtime retry/replay: bloqueado
Firestore writes: 0
Operational writes: 0
Reimportación: no
Deploy: no
Producción: no
Main/merge: no
```

## Aprobación humana

```text
Clientes: aprobado previamente
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Cobros: pendiente
Resto CRM: pendiente
```

## Siguiente frontera

La próxima autorización debe volver a cubrir un único macro-bloque read-only:

1. verificación runtime focalizada del root fix usando el lifecycle registry ya validado;
2. solo con PASS y snapshots iguales, Gate 7.11 completo;
3. STOP_RETRY automático;
4. cero escrituras, reimportación, deploy y producción;
5. sin microautorizaciones entre ambos pasos.
