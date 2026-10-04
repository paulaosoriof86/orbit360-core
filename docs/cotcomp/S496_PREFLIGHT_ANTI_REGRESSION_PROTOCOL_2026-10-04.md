# CotComp S4.96 — Protocolo obligatorio de preflight y anti-regresión

Fecha: 2026-10-04.

## 1. Regla de entrada

Antes de modificar código, assets, estilos, journey, schemas o integración CotComp, revisar obligatoriamente:

1. S496_CANONICAL_CONTEXT_GOVERNANCE_2026-10-04.md
2. S496_LOCKS_2026-10-04.md
3. S496_PRODUCT_INTAKE_MATRIX_2026-10-04.md
4. S484_PROVIDER_CONTRACT_SCHEMA_DRIVEN_SOURCEONLY_2026-10-03.md
5. S485_PRODUCTION_CLEAN_SCHEMA_INTAKE_PREVIEW_2026-10-03.md
6. S486_PRODUCT_FAMILY_COMPLETENESS_2026-10-03.md
7. S487_APPROVED_VISUAL_CONVERGENCE_2026-10-03.md
8. checkpoint técnico W4/S4.56
9. último artefacto/baseline visual aplicable.

Si una decisión nueva contradice una fuente anterior, la contradicción debe explicitarse y resolverse antes de implementar.

## 2. Delta obligatorio

Toda candidata nueva debe declarar:

- BASE
- CAMBIA
- NO CAMBIA
- DEPENDENCIAS
- RIESGOS
- GATES
- CRITERIO DE CIERRE

No se permite introducir cambios fuera del delta sin registrarlos.

## 3. QA de cuatro capas

### Capa A — Visual
- identidad;
- tipografía;
- hero;
- fotografía;
- iconografía;
- jerarquía;
- responsive;
- truncamientos;
- polish.

### Capa B — Journey
- etapa real;
- stepper;
- avanzar;
- volver;
- cambio de necesidad;
- edición;
- persistencia de contexto;
- acompañamiento;
- selección explícita.

### Capa C — Domain/Data
- preguntas correctas por país/producto;
- estados HYBRID / CONSULTATIVE / MORE_DATA_REQUIRED;
- no inventar requisitos;
- no degradar schemas previamente sustentados;
- no reducir Auto a Marca/Modelo/Año.

### Capa D — Arquitectura/Truth
- Gravicentra sigue siendo autoridad;
- no tasas/primas hardcodeadas;
- no provider directo;
- no Selection implícita;
- providerDeploymentAuthorized=false;
- cotcompRealTransportAuthorized=false;
- producción intacta.

PASS requiere las cuatro capas.

## 4. Regresión histórica

Un control no se considera PASS solo porque responde.

También debe verificarse:
- que conserve o mejore el comportamiento canónico;
- que no elimine una ruta previa;
- que no cambie semántica;
- que no desincronice stepper/estado;
- que no pierda datos compatibles;
- que no habilite capacidad no autorizada.

## 5. Owner Pass

Solo Paula puede convertir una candidata visual/funcional en baseline Owner-approved.

Un PASS técnico no equivale a Owner PASS.

Cuando exista Owner PASS se debe registrar:
- versión;
- URL/artefacto;
- commit;
- capturas/evidencia;
- qué quedó aprobado;
- qué quedó fuera;
- restricciones vigentes.

## 6. Cierre de bloque

Cada cierre debe actualizar:
- contexto canónico;
- locks si cambian;
- matriz de intake si cambia;
- Decision Log / documento equivalente;
- checkpoint;
- siguiente acción.

No avanzar al siguiente bloque si quedan contradicciones críticas abiertas.

## 7. Regla de no sustitución por recencia

Una versión más nueva no invalida automáticamente una decisión anterior.

La precedencia es:
Owner decision vigente > documento rector > baseline aprobado > candidato posterior.

Las candidatas no aprobadas son deltas, no nuevas fuentes de verdad.
