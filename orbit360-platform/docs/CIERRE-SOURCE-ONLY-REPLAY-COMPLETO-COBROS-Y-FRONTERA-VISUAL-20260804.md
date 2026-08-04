# Cierre source-only — replay completo de Cobros y frontera visual acumulativa

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Decisión

```text
GO_FULL_COBROS_REPLAY_SOURCE_ONLY
VISUAL_ACCUMULATIVE_BOUNDARY_READY
```

No se ejecutaron credenciales, Firebase, navegador, deploy, producción, Rules, main, merge ni escrituras.

## Causa raíz aplicada

El Gate 10.9 materializó cinco casos preseleccionados y no el universo completo. La ausencia de una cola durable para pagos reportados, evidencia multifuente, propuestas y HOLD hizo que la UI confundiera “cinco escritos” con “cinco existentes”.

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
DATA_CONTRACT_FAILURE
FUNCTIONAL_DEFECT
```

## Censo canónico preservado

```text
pólizas vigentes: 224
pólizas con calendario: 223
recibos calendario: 1,261
cartera pendiente: 641
exigible/vencido: 99
futuro: 542
pagos reportados: 365
sin saldo pendiente según aseguradora: 211
HOLD de estado: 44
programaciones superadas/excluidas: 20
cobros confirmados actualmente materializados: 5
```

El replay source-only conserva los controles sellados del corte 2026-07-30 y no solicita de nuevo los archivos.

## Implementación

`tools/orbit360-cobros-full-replay-v20260804.mjs`:

- consume el workbook privado o un JSON normalizado equivalente;
- exige las seis hojas canónicas;
- valida conteos y contratos;
- clasifica cada pago como vinculado, HOLD, requiere validación o sin contraparte;
- genera un plan privado con identificadores operativos;
- genera evidencia sanitizada con hashes;
- no importa Firebase ni permite escrituras.

`tools/orbit360-validar-cobros-full-replay-source-v20260804.mjs`:

- verifica sintaxis y ausencia de red/Firebase;
- ejecuta 365 pagos sintéticos, 1,261 recibos, 641 obligaciones y 44 HOLD;
- valida que 99 + 542 = 641;
- valida las siete autoridades y sus 641 obligaciones;
- exige cero escrituras y cero deploy.

## Contrato runtime posterior

Colecciones requeridas:

```text
pagosReportados
  ledger durable del CRM de cobranza

evidenciasCobro
  aseguradora, cartera temporal, comisión y banco como soporte

propuestasConciliacion
  coincidencias con recibos y diferencias preservadas

conciliacionHolds
  bloqueos y acción requerida

cobros
  únicamente aplicaciones confirmadas y autorizadas
```

## Frontera visual acumulativa

La siguiente revisión no será otra captura parcial. Debe cubrir en una sola candidata:

```text
Cliente 360
Aseguradoras
Pólizas
Vehículos
Recibos
Cartera
Cobros
Conciliaciones
Comisiones
Equipo/onboarding
Ops
Leads
```

La evidencia previa ya cubre Cliente 360, Aseguradoras, Pólizas, Ops y Leads. Vehículos, Recibos, Cartera, Cobros, Conciliaciones, Comisiones y Equipo requieren captura runtime nueva una vez la candidata tenga el ledger completo visible.

## Carriles

### A — visual/UX/Academia

- portal de revisión source-only acumulativo preparado;
- cobertura visual existente y faltante diferenciada;
- Academia debe enseñar pago reportado, evidencia, propuesta, HOLD y cobro confirmado.

### B — backend/seguridad

- tool y validador read-only preparados;
- cero Firebase y cero escrituras;
- contrato durable listo para el escritor posterior.

### C — datos A&S

- no se piden nuevamente fuentes;
- censo canónico preservado;
- las segundas entregas permanecen deduplicadas por hash;
- cinco cobros no se vuelven a presentar como universo completo.

## Siguiente acción exacta

1. Montar automáticamente el workbook privado ya existente en un runner controlado.
2. Ejecutar el replay fila por fila con cero escrituras.
3. Sellar conteos de vinculadas, propuestas, HOLD, requiere validación y sin contraparte.
4. Preparar un único gate de materialización durable.
5. Inmediatamente después, construir la candidata acumulativa y la revisión visual completa.

No se abre otro bloque periférico entre Cobros y visualización.
