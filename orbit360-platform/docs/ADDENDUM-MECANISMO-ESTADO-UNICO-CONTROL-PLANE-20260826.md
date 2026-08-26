# ADDENDUM — MECANISMO DE ESTADO ÚNICO DEL CONTROL-PLANE

**Fecha:** 2026-08-26  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open

## 1. Motivo

Este addendum no crea un roadmap nuevo. Sustituye exclusivamente el mecanismo que repetidamente generó `PIPELINE_MECHANISM_FAILURE` y `DOCUMENTATION_STATE_DRIFT`, en cumplimiento del Addendum Maestro de Control de Causa Raíz y del Addendum de Aceleración Productiva.

La causa sistémica comprobada fue mantener una autoridad declarada en el ledger y, al mismo tiempo, múltiples archivos y superficies externas que repetían fase, revisión, progreso, autorización y siguiente acción. Aunque se llamaran “proyecciones”, podían quedar atrás o ser regeneradas por owners/workflows diferentes.

## 2. Regla definitiva

Existe **un solo estado mutable**:

`orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`

Ningún otro archivo puede contener una copia autoritativa del estado operativo vivo.

Package, boundary, gate authority, lifecycles, live-state, documentation index, checkpoint, PR-state, README y CHANGELOG son contratos estáticos, evidencia histórica o punteros. No participan en la decisión del estado actual.

## 3. Escritura

Toda transición canónica debe:

1. leer HEAD vivo y ledger;
2. validar revisión esperada;
3. validar el contrato estático de transición;
4. mutar únicamente el ledger y, cuando corresponda, evidencia append-only;
5. crear un único commit con padre igual al HEAD leído;
6. mover la rama solo por fast-forward/CAS;
7. fallar cerrado si el HEAD cambió.

No existe reproyección posterior.

## 4. Transporte

Se retira el PR técnico como transporte de ejecución.

Una ejecución futura usa una rama efímera creada desde el HEAD canónico y exactamente un commit que modifica un solo intent bajo `.github/orbit360-intents/`.

El workflow valida que el padre del commit, el `canonicalBaseHead` del intent y el HEAD vivo sean idénticos. Para transiciones con riesgo, el primer cambio canónico es un claim del ledger publicado por CAS. Solo después se permite acceso a capacidades privilegiadas.

Un evento duplicado no puede reclamar el mismo estado dos veces: el primer claim cambia la revisión/HEAD y el segundo falla antes de riesgo.

## 5. Proyecciones retiradas

`tools/orbit360-continuity-projection-core-v20260825.mjs` y `tools/orbit360-continuity-projection-atomic-v20260820.mjs` quedan como entrypoints de compatibilidad **sin mutación**.

Está prohibido restaurar lógica que reescriba README, CHANGELOG, PR body, package, boundary o lifecycles después de una transición.

## 6. Gates

Antes de cualquier riesgo se ejecuta `tools/orbit360-single-state-invariant-v20260826.mjs`.

Debe comprobar como mínimo:

- exactamente un state-bearing file;
- cero projection targets;
- contratos estáticos;
- workflow sin PR técnico ni proyección documental;
- transporte de ejecución por un solo push;
- claim antes de riesgo;
- F2 terminal y evidencia causal coherentes cuando F2 esté cerrado.

## 7. Reuso transversal

Esta arquitectura es infraestructura transversal. Pólizas, Vehículos, Recibos, Cobros, Comisiones, Siniestros y módulos posteriores no pueden crear otro ledger, otro projection owner ni otro mecanismo de continuidad. Solo agregan handlers y contratos de dominio.

## 8. Academia

Debe enseñarse la diferencia entre:

- estado canónico vs evidencia/puntero;
- claim vs consumo de riesgo;
- CAS vs sincronización posterior;
- defecto funcional vs fallo del mecanismo;
- por qué una proyección humana nunca debe habilitar runtime o producción.

**Clasificación:** `BACKEND_PROTEGIDO_NO_CLAUDE` para implementación; `REPLICABLE_CLAUDE_ACUMULADO` y `ACADEMIA_ACTUALIZAR` para el patrón conceptual.
