# Cierre de causa raíz — Control-plane sin jobs y relay v8 — 2026-08-06

## Evidencia nueva

La captura de notificaciones y Gmail permitieron resolver el run exacto:

```text
workflow: .github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml
runId: 31128708226
commit: 9352968273fab431bea6ea6f16f0fb79af749ee2
resultado: No jobs were run
jobs observados: 0
```

## Corrección del diagnóstico

Se retira como causa raíz general:

```text
GITHUB_ACTIONS_EVENT_DISPATCH_UNAVAILABLE
```

El evento sí fue despachado y el workflow sí fue descubierto. La causa raíz controlable es:

```text
PIPELINE_MECHANISM_FAILURE
CONTROL_PLANE_JOB_CONDITION_EXCLUDED_ALL_JOBS
```

El workflow histórico usaba un trigger amplio de pull requests y una condición de job que excluía toda ejecución en los eventos observados. GitHub enviaba una notificación de fallo con `No jobs were run`, que fue interpretada erróneamente como falta de runners o de despacho.

## Factor sistémico

La rama contiene una acumulación extensa de workflows históricos. Varios conservan triggers amplios y contratos temporales. Esto genera ruido de control-plane y vuelve incorrecto crear un workflow nuevo para cada microbloque.

## Correctivo aplicado

Se reutilizó el mismo archivo que GitHub ya reconoce:

```text
.github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml
```

El workflow histórico de construcción automática de paquete fue retirado del trigger de PR y sustituido por un relay fail-closed:

- solo aplica a la rama canónica;
- todo commit que no sea exclusivamente un request v8 termina en `SKIP` seguro;
- el runtime solo se abre para `20260806.8-registered-relay-runtime`;
- exige `GO_GATE_CONTRACT` antes de secretos;
- conserva restauración, backup, máximo un deploy Hosting LAB, precheck, matriz, snapshot y rollback;
- cero Functions, Rules, reimportación, producción, main o merge.

Preflight nuevo:

```text
tools/orbit360-preflight-visual-matrix-runtime-relay-v8-v20260806.sh
```

Commits:

```text
preflight relay: 93f9fc4c2e1a0f6b188b2f5e914b680b093c5b97
workflow relay: db9b4da99f49f69999a45429aaa2fe590b38fae9
evidencia: 8aa2f4beb207245ad2e95d5cc6732d62032e0acb
```

## Estado de riesgo

```text
secretos leídos: no
Firebase accedido: no
Hosting tocado: no
navegador: no
Firestore/Auth/operational writes: 0
Functions/Rules/reimport/production/main/merge: 0
```

## Codex

Se generó un paquete descargable source-safe para fallback puntual. Codex no reemplaza la metodología directa y no debe pedir PowerShell, instalaciones, credenciales ni pasos locales a Paula.

## Siguiente acción

1. Confirmar que el relay registrado produce un job `SKIP` en commits no autorizados.
2. Activar lifecycle v8.
3. Crear un request v8 como commit exclusivo.
4. El mismo relay registrado ejecuta GO antes de secretos y, únicamente con PASS, el macrobloque runtime autorizado.
5. Ante cualquier fallo, STOP_RETRY sin segundo request.
