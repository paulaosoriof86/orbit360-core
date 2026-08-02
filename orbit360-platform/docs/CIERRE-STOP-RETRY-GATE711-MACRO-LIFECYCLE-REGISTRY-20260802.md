# Cierre STOP_RETRY — Gate 7.11 · macro root fix + gate completo

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block7-canonical-runtime-cumulative-visual-lab-v20260801`

## Autorización

La autorización cubría un único macro-bloque secuencial:

1. verificación runtime focalizada del root fix de Academia;
2. solamente con PASS, cero escrituras y snapshot intermedio idéntico, ejecución completa read-only del Gate 7.11;
3. sin microautorizaciones;
4. STOP_RETRY automático ante una etapa o familia repetida;
5. sin reimportación, deploy ni producción.

## Ejecución macro

```text
Run: 30766141784
Job: 91545118385
HEAD: 8f6d4bc6411cd1ac1ca516fd7df1c8767cc58bf3
Artifact: 8838994045
Digest: sha256:53cdf4c449d82e1853cdaac7960869ebfd7219f2b91c39855cbb483a14da6ac3
```

Resultado:

```text
classification: VALIDATOR_STALE
stage: preflight_before_secrets
failedCheck: LIFECYCLE_MATCHES_LEDGER
```

La ejecución se detuvo antes de instalar dependencias, acceder a secrets, leer Firestore o abrir navegador.

```text
Secret access: no
Firestore read: no
Runtime/browser: no
Root fix runtime: no ejecutado
Gate 7.11 completo: no ejecutado
Firestore writes: 0
Operational writes: 0
Reimportación: no
Deploy: no
Producción: no
```

## Causa raíz del preflight

El validador:

```text
tools/orbit360-validar-rootfix-static-readiness-gate711-v20260802.mjs
```

tenía codificada la ruta del lifecycle histórico:

```text
tools/orbit360-validator-lifecycle-contract-gate711-write-owner-diagnostic-runtime-v20260802.json
```

La autorización vigente había creado correctamente un lifecycle macro nuevo, pero el readiness seguía evaluando el archivo anterior. Por tanto, el producto no falló y el root fix de Academia no fue alcanzado por runtime.

Clasificación correcta:

```text
VALIDATOR_STALE
```

## Correctivo del mecanismo

Se creó el registro reusable:

```text
tools/orbit360-gate711-rootfix-lifecycle-registry-v20260802.json
```

El validador ahora:

- resuelve el lifecycle activo mediante ese registro;
- permite que el workflow indique explícitamente el lifecycle por variable de entorno;
- comprueba autorización, estado, digest acumulativo, root fix y límite de aprobación;
- no depende de un workflow o lifecycle histórico;
- mantiene exactamente 12 comprobaciones.

## Evidencia estática del correctivo

```text
Run: 30766213542
Job: 91545306596
Artifact: 8839016087
Digest: sha256:53b86815827caed22436bda9e16511ce182b261f2d6edc0d917482cfdc8d92e7
Status: GATE711_ROOTFIX_STATIC_READINESS_PASS
Checks: 12/12
```

Capacidades:

```text
Secrets: no
Firestore read: no
Runtime/browser: no
Writes: 0
Deploy: no
Producción: no
```

## Estado de seguridad

```text
Macro workflow: cerrado
Static corrective workflow: cerrado
Macro request: consumido
Static request: consumido
Request replay: bloqueado
Runtime retry: bloqueado
```

## Estado funcional

La causa raíz funcional de Academia continúa corregida:

```text
Owner: orbit360-platform/data/academia-v1230-operational-directory-v20260722.js
Root fix: fd49e1b15e69d1f023727b4ff92190852bcae1e0
Academia idempotente: 16/16 PASS
Identidad efímera: 14/14 PASS
Manifiesto acumulativo: 10/10 PASS
Lifecycle registry readiness: 12/12 PASS
```

No existe evidencia runtime nueva ni evidencia de que el root fix haya fallado.

## Siguiente frontera

Conforme al STOP_RETRY solicitado, esta autorización quedó consumida. No se puede reutilizar el workflow ni el request.

La próxima autorización, si se concede, debe volver a ser un único macro-bloque read-only con la misma secuencia condicional, pero utilizando desde el preflight el lifecycle registry ya validado. No debe existir ninguna microautorización entre la verificación focalizada y el Gate 7.11 completo.
