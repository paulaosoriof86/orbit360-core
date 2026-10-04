# CotComp — Contexto canónico vigente y bloque de gobierno S4.96

**Fecha:** 2026-10-04  
**Estado:** GOVERNANCE LOCK / NO FRONTEND CHANGE / NO PRODUCTION CHANGE  
**Base técnica actual:** `ays/cotcomp-s495-premium-refinement-lab-20261004`  
**Candidata visual actual:** `cotcompPremiumVisualPreviewS495`  
**Owner status:** S4.95 = REWORK / NO OWNER PASS  
**S4.96 runtime status:** DEPLOYED LAB / TECHNICAL PASS / OWNER REVIEW PENDING  
**S4.96 function:** `cotcompPremiumJourneyPreviewS496`  
**S4.96 deployed source commit:** `5329dcf49f9b4dbbd04ac05718a3825b9bfd00a1`  
**Next action:** Owner visual/functional review of S4.96, then targeted refinement only

## 1. Propósito

Este documento es el punto de entrada obligatorio antes de modificar CotComp. Su función es impedir pérdida de contexto, regresiones funcionales y reinterpretaciones de decisiones ya cerradas.

La memoria conversacional no es fuente contractual. Antes de cambiar CotComp debe revisarse este archivo y las fuentes rectoras referenciadas.

## 2. Fuentes rectoras en orden

1. Decisiones Owner vigentes del proyecto.
2. Handoff técnico Gravicentra–CotComp v1.1 del 2026-10-03.
3. Checkpoint canónico W4 / S4.56 del 2026-10-01.
4. Contrato provider-side S4.84.
5. Intake schema-driven S4.85.
6. Product-family completeness S4.86.
7. Visual convergence S4.87.
8. Baseline funcional recuperado del CotComp F7/S4.18.
9. Candidatas S4.93–S4.95 solo como deltas visuales/experimentales; no sustituyen arquitectura anterior por el hecho de ser más recientes.

## 3. Decisiones congeladas

### Autoridad
- Gravicentra es la fuente de autoridad de aseguradoras, productos/planes, elegibilidad, reglas, tarifas, primas, impuestos, gastos, fraccionamiento, fuentes, bindings, vigencias, Proposal y facts normalizados.
- CotComp/Web conserva autoridad sobre journey público, captura progresiva, UX, Comparison UX, explicación de diferencias, explicit user choice y analítica de funnel.
- El navegador no se conecta directamente a rater/proveedor.
- CotComp no recalcula primas ni duplica reglas financieras.

### Release
- `providerDeploymentAuthorized=false`
- `cotcompRealTransportAuthorized=false`
- Producción no se toca.
- W5 real-data pilot sigue fuera de alcance sin autorización Owner separada.

### Producto público
Las siete familias visibles siguen siendo:
1. Vehículo / movilidad.
2. Hogar.
3. Salud / gastos médicos.
4. Vida / ingreso.
5. Empresa.
6. Transporte / carga.
7. Otros / no sé cuál necesito.

Estas siete familias son la entrada visual. No eliminan rutas profundas previamente diseñadas como contrato/obligación, revisión de póliza existente o descubrimiento/orientación.

### Vehículos
Se conserva el patrón Owner-approved:
`Marca searchable → Línea/modelo searchable dependiente → Año separado`
y los fallbacks:
- No encuentro mi marca.
- No encuentro mi línea / modelo.

## 4. Estado técnico que no puede olvidarse

W1, W2, W3 y W4 tienen evidencia física PASS en LAB. W4 probó:
- QuoteCase + Proposal + ComparisonSet sintéticos;
- Selection explícita atómica;
- retry idempotente;
- conflict deny;
- separación USER_SELECTED_FOR_CONTINUATION / ISSUED / BOUND / CONFIRMED;
- cleanup;
- cero documentos persistentes finales;
- cero datos reales;
- producción intacta.

Esto significa que el backend CotComp no parte de cero. La siguiente fase visual/UX debe integrarse con esta arquitectura en lugar de sustituirla.

## 5. Estado S4.95

S4.95 conserva una dirección visual mejorada, pero NO es baseline aprobado integral.

### Conservar
- shell A&S actual;
- enfoque editorial premium;
- workspace CotComp;
- siete familias;
- iconografía enriquecida;
- integración dentro de página A&S;
- comparación de alternativas;
- Recomendación A&S;
- lógica multiproducto;
- tabs Cotización en línea / Con acompañamiento;
- Marca → Línea/modelo → Año.

### Rework obligatorio
- hero: proporción, crop y jerarquía tipográfica;
- resolver visual determinístico por producto/selección;
- evitar desaparición de imagen al cambiar selección/modo;
- jerarquía del comparativo expandido y bloques finales;
- restaurar máquina de estados canónica;
- restaurar intake real por país/producto;
- corregir retroceso/progreso;
- reconciliar acompañamiento con estado real del journey.

## 6. Regla anti-regresión principal

Una candidata visual nunca se convierte por sí sola en fuente de verdad funcional.

Toda nueva candidata debe demostrar simultáneamente:
1. fidelidad al Surface Lock;
2. fidelidad al Journey Lock;
3. fidelidad al Domain/Data Lock;
4. delta explícitamente autorizado;
5. ausencia de regresiones contra el último baseline aplicable.

## 7. Siguiente bloque

S4.96 deberá usar el frontend S4.95 como piel visual refinada, pero restaurar por debajo:
- journey canónico;
- intake progresivo;
- schema por país/producto;
- persistencia de contexto;
- navegación atrás/adelante correcta;
- visual resolver único;
- jerarquía de comparación/recomendación;
- tipografía canónica A&S.

No activar transporte real ni producción.


## 8. S4.96 runtime closure update — 2026-10-04

- Workflow run `37192953945`: SUCCESS.
- Governance preflight: PASS.
- Accumulated source QA: PASS.
- LAB deploy: PASS.
- Physical verification: PASS.
- Focused browser regression after parent-render race fix:
  - vehicle intake group headings persist after page settlement: PASS;
  - headings reappear after Health → Vehicle navigation: PASS;
  - right-side image never blank in tested navigation: PASS;
  - Elegir esta alternativa visible: PASS;
  - Ver detalles visible: PASS;
  - Ver recomendación completa visible: PASS.
- The parent-render race that could overwrite S4.96 intake with S4.94/S4.95 form content was corrected with ownership/reconciliation guards.
- S4.96 is not Owner-approved yet. Technical PASS does not promote it.
