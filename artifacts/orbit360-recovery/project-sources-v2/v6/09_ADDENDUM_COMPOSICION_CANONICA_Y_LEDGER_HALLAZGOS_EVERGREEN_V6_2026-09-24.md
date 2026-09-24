# Gravicentra Insurance — Addendum Evergreen V6
## Composición Canónica Acumulativa, Ledger de Hallazgos y Cierre Antirregresión

**Estado documental:** STATIC_NORMATIVE_EVERGREEN  
**Proyecto:** Gravicentra Insurance  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama canónica:** `recovery/fase-a-clean-20260831`  
**Fecha:** 2026-09-24

> Este documento no contiene gate, HEAD, run, buildId, Preview URL, porcentaje ni estado operativo mutable. El estado vivo se obtiene exclusivamente de `CONTROL_PLANE.json`.

## 1. Prevalencia y finalidad

Este Addendum V6 extiende las fuentes Evergreen vigentes sin sustituir V3, V4 ni V5.

Su finalidad es impedir definitivamente que la regla “una sola candidata acumulativa e incremental” dependa de listas duplicadas de archivos, estados textuales del workflow o interpretación de una conversación.

## 2. Causa raíz normativa congelada

La regresión recurrente no se originó únicamente en módulos individuales.

La causa raíz fue **RELEASE_MECHANISM_COMPOSITION_AUTHORITY_SPLIT**:

- la intención de mantener una sola candidata era correcta;
- pero la composición física permitida estaba distribuida entre Control Plane, locks de bloques, scopes históricos de successors y listas de estados hardcodeadas en guards/workflows;
- por tanto, una corrección legítima podía existir en el árbol acumulado y, aun así, un consumidor podía ignorarla porque no reconocía el estado textual vigente;
- el sistema podía bloquear mejoras legítimas, o peor, depender de sincronización manual entre varias listas para preservar todo lo aprobado.

## 3. Solución definitiva — una autoridad física de composición

Debe existir un único **Canonical Accumulative Composition Lock** activo para la candidata de producto.

Ese lock gobierna:

1. baseline certificado;
2. bloque activo;
3. conjunto exacto de archivos de producto que difieren del baseline;
4. Git blob SHA actual de cada archivo;
5. relación con la evidencia y el plan activo.

Reglas obligatorias:

- el diff físico de producto debe ser **exactamente igual** al conjunto declarado;
- cada path queda ligado a su blob actual;
- ningún archivo de producto modificado puede quedar fuera del manifest;
- ningún archivo inexistente en el diff puede permanecer preautorizado;
- todo cambio de product source y su manifest deben quedar en el mismo commit atómico;
- los estados textuales de B1/B2/B3/B4 no pueden gobernar qué archivos forman la candidata;
- ningún módulo histórico, overlay o owner anterior puede sustituir silenciosamente un owner vigente;
- Preview y LIVE continúan usando el mismo artifact certificado.

## 4. Regla de owner efectivo

Antes de modificar una capability:

- identificar el runtime owner efectivo;
- localizar primero en el repo la última implementación ya desarrollada/aprobada cuando sea razonablemente localizable;
- reutilizar/conectar esa implementación si es la autoridad correcta;
- si localizarla resulta más costoso que una corrección causal directa, corregir el owner canónico actual;
- prohibido crear un owner paralelo para “resolver rápido”;
- después del cambio, probar que ningún owner viejo lo shadowea o sobrescribe.

## 5. Ledger obligatorio de hallazgos

Todo hallazgo visual, funcional, de permisos, datos, relaciones, performance, release o deuda diferida debe vivir en un único **Findings Ledger** versionado.

Cada hallazgo conserva como mínimo:

- ID estable;
- bloque;
- fuente/origen;
- superficie;
- owner;
- causa raíz cuando ya esté demostrada;
- remediación;
- estado;
- si bloquea o no;
- prueba requerida para cierre.

Un hallazgo nunca desaparece del ledger por avanzar de iteración.

Solo puede quedar:

- `CLOSED_PASS` con prueba física;
- `DEFERRED_NON_BLOCKING_WITH_EXPLICIT_AUTHORITY`;
- `NOT_APPLICABLE_WITH_EVIDENCE`;
- o permanecer OPEN.

B3 no puede abrirse con blockers B2 abiertos. B4 no puede promover LIVE con blockers de B2/B3 o carry-forwards sin disposición final.

## 6. Política de pruebas

Un PASS técnico histórico se conserva salvo invalidación causal.

Un flujo crítico exige, según aplique:

**UI autenticada → servidor → commit → readback canónico → reload/reopen → auditoría → evidencia de release exacta**

La visualización de Paula sigue siendo obligatoria donde corresponde y puede rechazar una candidata aunque el harness esté verde.

## 7. Política de velocidad

El recovery no vuelve a abrir auditorías generales ya cerradas.

Por bloque, el ciclo normal máximo es:

1. causa/owner → corrección → composición exacta → build/Preview → prueba automática;
2. visualización humana → solo correcciones causales observadas → reproof/freeze.

Una tercera vuelta solo se justifica por una discrepancia concreta y reproducible.

## 8. Datos operativos

La autoridad de composición de producto no autoriza repetir cargas de datos.

Continúan vigentes:

- delta-first de V5;
- no reimportar para arreglar UI/permisos/routing/cache;
- no repetir applies ya cerrados sin causalidad;
- nuevas pólizas posteriores al corte permanecen en cola de actualización y se incorporan por delta después de certificar el bloque de producto activo.

## 9. Continuidad

En toda reanudación:

1. Control Plane;
2. Canonical Accumulative Composition Lock;
3. Findings Ledger;
4. lock del bloque activo;
5. evidencia física correspondiente.

La conversación nunca reconstruye la candidata.

## 10. Regla final

Una mejora solo se considera incorporada al producto cuando está simultáneamente:

- presente en el árbol canónico acumulativo;
- declarada en la composición exacta;
- ligada a su blob;
- ejecutada por el owner correcto;
- probada en la release identity correspondiente;
- y, cuando aplique, aceptada visualmente.

No se vuelve a “recuperar la mejor versión” en iteraciones posteriores por pérdida de composición: la candidata acumulativa se convierte en un objeto físico verificable y fail-closed.
