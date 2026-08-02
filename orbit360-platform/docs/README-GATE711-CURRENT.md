# Gate 7.11 — referencia vigente

Fecha: 2026-08-02

Leer en este orden:

1. `CIERRE-CAUSA-RAIZ-ACADEMIA-SESSION-WRITES-GATE711-20260802.md`
2. `ACADEMIA-CAUSA-RAIZ-SESSION-WRITES-IDEMPOTENCIA-20260802.md`
3. `CLAUDE-ROOTFIX-IDEMPOTENT-STATIC-CONTENT-SESSION-20260802.md`
4. `CIERRE-STOP-RETRY-GATE711-BROWSER-WRITE-ATTEMPT-20260802.md`
5. `CIERRE-DIAGNOSTICO-OWNER-STATIC-PASS-GATE711-20260802.md`
6. `CIERRE-STOP-RETRY-GATE711-AUTHORIZATION-BINDING-20260802.md`
7. `CIERRE-CAUSA-RAIZ-GATE711-LEGAL-DIFERIDO-20260802.md`

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
```

Cada cambio de rol reejecutaba cinco mutaciones de contenido estático de Academia. En Dirección, Operativo y Asesor se capturaron quince intentos:

```text
9 insert → lecciones
3 insert → evaluaciones
3 update → config
```

Todos fueron bloqueados. Firestore y los datos operativos permanecieron sin cambios.

## Correctivo

```text
Commit: fd49e1b15e69d1f023727b4ff92190852bcae1e0
Root fix: 20260802.1
```

- eliminado el listener `orbit:session`;
- contenido 1.232 preservado;
- upsert limitado a los cinco IDs objetivo;
- comparación antes de escribir;
- mismo store y mismo contenido producen cero llamadas adicionales.

## Evidencia vigente

```text
Diagnóstico exacto:
run 30762248796 · 15 intentos bloqueados

Academia idempotente:
run 30762515438 · 16/16 PASS

Manifiesto acumulativo:
run 30762785016 · 10/10 PASS

Identidad efímera reusable:
14/14 PASS

Readiness integral:
run 30763065758 · 12/12 PASS
```

Nuevo digest acumulativo:

```text
9e737a2e20ee868ec804a66d249957260164ea393ed4576d4a67b3508a00f762
```

Solo cambió el owner corregido de Academia. Se conservaron 309 archivos, el path digest y `index.html`.

## Límite actual

La causa raíz está corregida y estáticamente lista. La verificación runtime focalizada no se completó porque un validador obsoleto leyó un workflow histórico cerrado. El validador ya fue corregido mediante un contrato reusable, pero STOP_RETRY impide otra ejecución bajo la autorización consumida.

```text
Autorizaciones activas: 0
Runtime replay: bloqueado
Secrets/Firestore/browser: deshabilitados
Writes: 0
Reimportación: no
Deploy/producción: no
```

## Siguiente acción única

Una sola autorización macro deberá cubrir secuencialmente:

1. verificación runtime focalizada del root fix;
2. solo si pasa, ejecución completa read-only del Gate 7.11;
3. STOP_RETRY automático ante una etapa o familia repetida;
4. cero escrituras, reimportación, deploy y producción.

No se solicitarán microautorizaciones entre ambos pasos. La aprobación visual humana de Pólizas, Vehículos, Recibos, Cartera, Cobros y resto CRM continuará pendiente.
