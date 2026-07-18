# Bloque 1 · contrato 1.0.11

Fecha: 2026-07-17

Gate: `block1-client360-insurers-lab-v20260717`

## Evidencia acumulada

El run `29615254551` confirmó preflight, canal LAB y conteos 414/26/7. El requisito de menú múltiple antes del acceso fue retirado porque Access funciona correctamente en modo fail-closed.

El run `29625166230` volvió a detenerse en una condición compuesta de bootstrap. Esa evidencia no permite atribuir el fallo a producto, Auth, Router o transporte.

## Clasificación vigente

`PIPELINE_MECHANISM_FAILURE`.

No se modifica ningún owner de producto hasta aislar una sola precondición.

## Diagnóstico aplicado

La espera compuesta se divide en etapas acotadas:

1. URL canónica;
2. runtime backend y Firebase;
3. proveedor Auth;
4. UI Auth inicializada;
5. handoff de owners;
6. inicio del Router;
7. estabilidad final.

El artefacto sanitizado registra además el último recurso iniciado, terminado, fallido o con error HTTP y los errores de página sin datos sensibles.

## Carriles

- A: frontend y módulos preservados.
- B: observabilidad del validador corregida; producto congelado.
- C: datos 414/26/7 preservados; sin reimportación.

## Claude y Academia

- `REPLICABLE_CLAUDE_INMEDIATO`: una espera compuesta debe producir etapas observables.
- `REPLICABLE_CLAUDE_ACUMULADO`: URL → runtime → proveedor → Auth UI → owners → Router → estabilidad.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: canal, acceso y diagnóstico CI.
- `ACADEMIA_ACTUALIZAR`: distinguir defecto funcional de validador sin observabilidad.

## Estado

`ACTIVE_ROOT_CAUSE_DIAGNOSTIC`.

La siguiente ejecución solo identifica la primera etapa y el recurso responsables. No habilita revisión visual salvo evidencia final `ok:true`. Bloque 2 y producción permanecen bloqueados.
