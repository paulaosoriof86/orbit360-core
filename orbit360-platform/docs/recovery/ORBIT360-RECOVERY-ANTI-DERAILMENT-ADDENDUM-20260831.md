# Orbit 360 — Addendum Anti-Descarrilamiento de Recuperación

**Fecha:** 2026-08-31  
**Rama:** `recovery/fase-a-clean-20260831`  
**Plan rector:** `ORBIT360-FASE-A-CLEAN-RECOVERY-MASTER-PLAN-20260831.md` v1.1

## Propósito

Este addendum existe para impedir que un fallo, nueva conversación, handoff, agente, validator o root-cause secundario desplace la recuperación fuera del plan maestro.

## Regla de retorno obligatorio

Ante cualquier desvío o interrupción:

1. Leer `orbit360-recovery-state-v1.json`.
2. Leer `orbit360-approved-capability-manifest-v1.json`.
3. Leer el Plan Maestro v1.1.
4. Identificar el **último gate PASS**.
5. Identificar el **primer gate incompleto**.
6. Clasificar el nuevo hallazgo únicamente como `PRODUCT`, `DATA`, `SECURITY`, `PERFORMANCE`, `RELEASE/COMPOSITION`, `PIPELINE/VALIDATOR` o `ENVIRONMENT`.
7. Resolver el hallazgo dentro de ese gate; no abrir metodología paralela.
8. No tocar módulos ya PASS salvo regresión reproducible que los involucre causalmente.
9. No tocar datos si el fallo es de source, visualización, routing, cache, composición o validator.
10. No tocar producción salvo que el gate activo sea Iteración 5 y exista autorización explícita.
11. Actualizar `orbit360-recovery-state-v1.json` con la acción siguiente exacta.

## Condición especial: nueva conversación o nuevo agente

El primer mensaje operativo debe declarar:
- rama;
- SHA/estado de recovery;
- iteración activa;
- último gate PASS;
- primer gate incompleto;
- módulos PASS/PENDING;
- producción tocada sí/no;
- datos tocados sí/no;
- siguiente acción exacta.

Si no puede demostrar estos datos desde las autoridades, debe leerlas antes de ejecutar cambios.

## Condición especial: defecto nuevo

Un defecto nuevo NO autoriza:
- nueva rama de release ordinaria;
- nuevo plan maestro;
- reimportación;
- reconstrucción completa;
- reemplazo de Firebase;
- reabrir todos los módulos;
- otro mecanismo de overlay.

Solo se amplía el alcance si existe evidencia causal de que el defecto afecta más componentes.

## Condición especial: build/preview/producción

- Cambio de source después de build => digest nuevo y regreso al inicio de Iteración 3.
- Fallo individual de módulo en preview => Iteración 4A sigue abierta; corregir source, nuevo artifact, repetir pruebas afectadas + regresión transversal.
- Fallo transversal en preview => Iteración 4B sigue abierta.
- Fallo en producción => rollback automático y Iteración 5 continúa abierta; no cargar datos.
- Data refresh nunca se usa para reparar producto.

## Condición especial: pruebas módulo por módulo

No puede declararse Fase A lista si una sola capacidad Fase A carece de:
- lineage aprobado;
- preview individual PASS;
- versión/build comprobada;
- live individual PASS después de producción.

## Uso de Codex

Codex solo puede abrirse cuando la tarea sea mecánica, amplia y mediblemente más eficiente que realizarla con ChatGPT/GitHub. Debe recibir como autoridades el state, capability manifest, plan y este addendum. Su salida no cambia estados por sí sola; debe ser verificada antes de promoverse.

## Frase de recuperación universal

`RETORNAR_A_PLAN: leer state + capability manifest + Plan Maestro v1.1 + Addendum; volver al último gate PASS y ejecutar solo el primer gate incompleto.`
