# Gravicentra Insurance — Addendum Anti-Descarrilamiento de Recovery

**Fecha:** 2026-08-31  
**Rama:** `recovery/fase-a-clean-20260831`  
**Plan rector:** `GRAVICENTRA-INSURANCE-FASE-A-RECOVERY-MASTER-PLAN-v1.3-20260831.md`  
**Proyecto ChatGPT:** `Gravicentra Insurance` con Memoria solo del proyecto.

## Propósito

Impedir que un fallo, nueva conversación, handoff, agente, validator o root-cause secundario desplace la recuperación fuera del plan maestro.

## Regla de retorno obligatorio

Ante cualquier desvío o interrupción:
1. Leer `ADDENDUM_PREVALENTE_CHATGPT_PROJECT_BOUNDARY_20260831.md`.
2. Leer `orbit360-recovery-state-v1.json`.
3. Leer Plan Maestro v1.3.
4. Leer `orbit360-approved-capability-manifest-v1.json`.
5. Leer esta Addendum y la matriz módulo por módulo.
6. Identificar el **último gate PASS**.
7. Identificar el **primer gate incompleto**.
8. Clasificar el hallazgo únicamente como `PRODUCT`, `DATA`, `SECURITY`, `PERFORMANCE`, `RELEASE/COMPOSITION`, `PIPELINE/VALIDATOR` o `ENVIRONMENT`.
9. Resolverlo dentro de ese gate; no abrir metodología paralela.
10. No tocar módulos ya PASS salvo regresión causal reproducible.
11. No tocar datos si el fallo es source, visualización, routing, cache, composición, permisos o validator.
12. No tocar producción salvo Iteración 5 y autorización explícita.
13. Actualizar `orbit360-recovery-state-v1.json` con la siguiente acción exacta.

## Nueva conversación o agente

La primera respuesta operativa debe declarar:
- proyecto/branding;
- rama;
- SHA/estado de recovery;
- iteración activa;
- último gate PASS;
- primer gate incompleto;
- módulos PASS/PENDING;
- producción tocada sí/no;
- datos tocados sí/no;
- Codex usado sí/no;
- siguiente acción exacta.

Si no puede demostrar estos datos desde las autoridades, debe leerlas antes de ejecutar cambios.

## Defecto nuevo

Un defecto nuevo NO autoriza:
- nueva rama de release ordinaria;
- nuevo plan paralelo;
- reimportación;
- reconstrucción completa;
- reemplazo de Firebase;
- reabrir todos los módulos;
- otro mecanismo de overlay;
- volver al Proyecto ChatGPT histórico Orbit 360.

Solo se amplía alcance si existe evidencia causal de que el defecto afecta más componentes.

## Build / preview / producción

- Cambio source después de build => digest nuevo y regreso al inicio de Iteración 3.
- Fallo individual preview => Iteración 4A abierta; corregir source, nuevo artifact y repetir pruebas afectadas + regresión necesaria.
- Fallo transversal preview => Iteración 4B abierta.
- Fallo producción => rollback automático y Iteración 5 abierta; datos HOLD.
- Data refresh nunca se usa para reparar producto.

## Pruebas módulo por módulo

No puede declararse Fase A lista si una sola capacidad Fase A carece de:
- lineage aprobado;
- `LATEST_APPROVED_VERSION_PREVIEW_PASS`;
- build/version comprobado;
- `LATEST_APPROVED_VERSION_LIVE_PASS` después de producción.

## Uso de Codex

Codex solo se usa cuando la tarea es mecánica, amplia y mediblemente más eficiente que ChatGPT/GitHub. Debe recibir Addendum Prevalente, state, Plan v1.3, capability manifest y esta addendum. Su salida no cambia estados por sí sola.

## Frase universal

`RETORNAR_A_PLAN: leer Addendum Prevalente + state + Plan v1.3 + capability manifest + Addendum Anti-Descarrilamiento + matriz; volver al último gate PASS y ejecutar solo el primer gate incompleto.`
