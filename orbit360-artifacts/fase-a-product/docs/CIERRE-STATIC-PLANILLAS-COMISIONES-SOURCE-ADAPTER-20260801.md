# CIERRE STATIC — PLANILLAS Y COMISIONES — SOURCE ADAPTER

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Modo:** estático, fixtures sintéticos exclusivamente  
**Producción / deploy / Firestore / navegador:** no ejecutados

## 1. Estado vigente

El adaptador reusable quedó en:

```text
schema: orbit360-planillas-comisiones-source-adapter-v1.1
resultado: STATIC_ADAPTER_PASS
clasificación: GO_STATIC_SOURCE_ADAPTER
```

Evidencia vigente:

```text
run: 30717588903
job: 91415768713
artifact: 8823819018
artifact digest: sha256:cbff239965dea8596956b35dc1af1d5263f7be4bfb650b9e194bceda625df34d
HEAD auditado: 413c34f812ff60e7d21c042da71f770c8dbffb68
checks: 42/42 PASS
```

La evidencia anterior `30714979430 · 32/32` queda como antecedente histórico de v1.0, no como contrato vigente.

## 2. Implementación

```text
orbit360-platform/core/planillas-comisiones-source-adapter-p0.js
tools/orbit360-test-planillas-comisiones-source-adapter-p0-v20260801.mjs
.github/workflows/orbit360-planillas-comisiones-source-adapter-static-v20260801.yml
.github/orbit360-triggers/planillas-comisiones-source-adapter-static-v20260801.json
```

El componente no está incluido en `index.html`, no modifica UI y no se conecta al importador productivo.

## 3. Contrato vigente

Continúan siendo obligatorios:

- país confiable;
- moneda confiable;
- periodo exacto;
- póliza;
- prima neta;
- comisión del intermediario;
- trazabilidad de archivo, hoja y fila.

La fecha exacta se maneja así:

```text
modo estricto: fecha requerida
fuente mensual: allowPeriodOnly=true + periodo explícito
```

Nunca se inventa un día para completar una fuente mensual.

## 4. Deduplicación segura

La v1.0 podía omitir filas visualmente idénticas aunque la fuente no tuviera una identidad documental suficiente. Una fuente real demostró que ese supuesto podía romper la conciliación planilla–factura.

La v1.1 aplica:

```text
identidad fuerte:
  póliza + al menos una referencia documental o fecha

identidad débil:
  preservar filas y trazabilidad
```

La identidad incorpora:

- producto;
- póliza;
- relación de ingreso;
- fecha;
- requerimiento;
- serie;
- factura;
- número de pago;
- ramo;
- prima neta;
- comisión.

`OMIT_DUPLICATE` solo puede emitirse con identidad fuerte.

## 5. Decisiones comprobadas

```text
CANDIDATE
REQUIERE_VALIDACION
HOLD_PERIOD_MISMATCH
OMIT_DUPLICATE
```

Además, la evidencia comprueba:

```text
periodOnlySupportedWithExplicitOptIn: true
strictModeStillRequiresPaymentDate: true
weakIdentityDuplicatePreserved: true
strongIdentityDuplicateOmitted: true
branchIncludedInIdentity: true
```

## 6. Causa raíz

### Incidencia histórica 1

Los runs `30714867827` y `30714923492` fallaron porque el detector interpretaba comentarios como accesos a capacidades. Tras `STOP_RETRY`, se corrigió únicamente el detector.

### Incidencia vigente resuelta

El perfilado read-only de fuentes reales reveló:

1. planillas mensuales válidas sin fecha exacta por fila;
2. filas de identidad débil que no podían deduplicarse automáticamente.

Clasificación:

```text
VALIDATOR_STALE
```

Se corrigieron adaptador, pruebas, workflow, trigger, documentación y Academia en el mismo bloque.

## 7. Seguridad

```text
fixtureType: SYNTHETIC_ONLY
realRowsUsed: 0
containsPII: false
containsPolicyNumbers: false
containsAmounts: false
secretsRead: false
firestoreRead: false
firestoreWrites: 0
operationalWrites: 0
storeAccess: false
browserExecuted: false
deployExecuted: false
productionTouched: false
```

No se modificó `core/importa.js`, `Orbit.store`, Auth, Rules, Functions ni adaptadores protegidos.

## 8. Relación con el corte real

El paquete privado del corte junio produjo:

```text
19 archivos
10 paquetes de fuente
67 filas observadas
65 candidatas CRM
2 omitidas por comisión cero
8 pares planilla–factura exactos
```

La evidencia real permanece fuera del repositorio. El detalle está documentado en:

```text
CIERRE-READONLY-PLANILLAS-COMISIONES-CORTE-JUNIO-20260801.md
AUDITORIA-READONLY-PLANILLAS-COMISIONES-CORTE-JUNIO-SANITIZADA-20260801.json
```

## 9. Siguiente acción exacta

```text
validar contrato del gate read-only de vinculación LAB
→ cruzar candidatos contra pólizas, recibos y cobros
→ producir dry-run de coincidencias y HOLD
→ mantener cero escrituras y finanzas inactivas
```
