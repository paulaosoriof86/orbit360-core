# CIERRE READ-ONLY — PLANILLAS Y COMISIONES — CORTE JUNIO 2026

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Modo:** fuentes privadas, extracción y dry-run read-only  
**Producción / deploy / Firestore / Orbit.store / escrituras:** no ejecutados

## 1. Bloque

Ruta vigente:

```text
Cobros/conciliación cerrado
→ Planillas y comisiones activo
→ financiero histórico pendiente
```

Este corte prepara información real de comisiones para CRM sin promoverla todavía a movimientos financieros, CxC, CxP ni liquidaciones de asesores.

## 2. Fuentes recibidas

```text
archivos: 19
paquetes aseguradora/moneda/periodo: 10
periodo predominante: junio 2026
filas reales observadas en paquete privado: 67
```

Los archivos se mantuvieron fuera del repositorio. La evidencia versionada no contiene PII, pólizas ni importes.

## 3. Resultado del dry-run CRM

```text
filas elegibles CRM: 65
  con fecha exacta: 34
  con periodo mensual explícito: 29
  reversiones negativas preservadas: 2
filas omitidas por comisión cero: 2
escrituras: 0
```

Las filas mensuales sin fecha exacta no recibieron un día inventado. Conservan el periodo `2026-06` y trazabilidad de archivo, hoja/página y fila.

## 4. Conciliación planilla–factura

```text
pares exactos: 8
planilla sin factura: 1
factura con planilla incompleta: 1
```

Resultados por paquete:

| Paquete | Filas | CRM | Conciliación documental |
|---|---:|---|---|
| El Roble GTQ | 32 | CANDIDATE_READONLY | EXACT |
| La Ceiba GTQ | 6 | CANDIDATE_READONLY | EXACT |
| Aseguradora Guatemalteca GTQ | 5 | CANDIDATE_READONLY | EXACT |
| Universales GTQ | 6 | CANDIDATE_READONLY | EXACT |
| Ficohsa GTQ | 1 | CANDIDATE_READONLY | PLANILLA_ONLY |
| Columna GTQ | 9 | CANDIDATE_READONLY | EXACT |
| Bantrab GTQ | 4 | CANDIDATE_READONLY | EXACT |
| G&T GTQ | 3 | CANDIDATE_READONLY | EXACT |
| G&T USD | 1 | CANDIDATE_READONLY | EXACT |
| Mapfre GTQ | 0 | HOLD_SOURCE_PACKAGE_INCOMPLETE | INVOICE_ONLY |

## 5. Causa raíz y corrección transversal

La primera aplicación del adaptador real reveló dos supuestos obsoletos.

### 5.1 Periodo mensual sin fecha exacta

Varias fuentes válidas informan mes y año, pero no fecha de pago por fila. El contrato maestro exige país, moneda y periodo confiables; no obliga a inventar un día.

Clasificación:

```text
VALIDATOR_STALE
```

Corrección:

- modo `allowPeriodOnly` explícito;
- país, moneda y periodo siguen siendo obligatorios;
- el modo estricto continúa exigiendo fecha exacta;
- nunca se deriva un día ficticio.

### 5.2 Duplicados con identidad débil

El Roble contiene filas visualmente idénticas. Eliminarlas como duplicados rompe la conciliación con la factura, por lo que no son descartables solo por coincidir en póliza e importes.

Clasificación:

```text
VALIDATOR_STALE
```

Corrección:

- deduplicación automática únicamente con identidad fuerte;
- identidad fuerte requiere póliza y al menos fecha o referencia documental;
- ramo y número de pago forman parte de la identidad;
- filas de identidad débil se preservan y mantienen trazabilidad.

## 6. Gate estático del root fix

```text
run: 30717588903
job: 91415768713
artifact: 8823819018
artifact digest: sha256:cbff239965dea8596956b35dc1af1d5263f7be4bfb650b9e194bceda625df34d
HEAD auditado: 413c34f812ff60e7d21c042da71f770c8dbffb68
resultado: STATIC_ADAPTER_PASS
checks: 42/42
```

Comprobó:

- periodo mensual solo con opt-in;
- modo estricto preservado;
- duplicados débiles preservados;
- duplicados fuertes omitidos;
- ramo incluido en identidad;
- país, moneda, prima neta y comisión separados;
- cero filas reales en CI;
- cero acceso operativo.

## 7. Hallazgos abiertos

### Mapfre

`Planilla Mapfre.xls` es un frameset HTML que referencia un archivo externo no incluido. La factura está disponible, pero no hay filas autosuficientes. Estado:

```text
HOLD_SOURCE_PACKAGE_INCOMPLETE
```

Se requiere XLSX, CSV, PDF autosuficiente o el paquete HTML completo.

### Ficohsa

La planilla contiene una fila GTQ y puede usarse en CRM read-only. Falta la factura correspondiente, por lo que queda:

```text
CRM: CANDIDATE_READONLY
FINANZAS: HOLD_INVOICE_MISSING
```

### Aseguradora Guatemalteca

El nombre de intermediario en la planilla difiere del nombre legal del tenant que emitió la factura. Se preservan código y nombre de origen; la relación debe validarse antes de liquidaciones.

### El Roble — comisión de vendedor

La comisión A&S concilia con la factura. El total de comisión de vendedor visible al final del CSV no coincide con la suma del detalle. No bloquea el histórico CRM de comisión A&S, pero sí bloquea liquidaciones de asesores.

Los códigos `PAU` y `FER` se conservaron como valores de origen y deberán resolverse mediante configuración tenant, nunca por hardcode genérico.

## 8. Carriles

### Carril A — CRM / UX / Academia

Avance visible:

- histórico de comisiones preparado para 65 filas;
- estados honestos `CANDIDATE`, `OMIT` y `HOLD`;
- Academia debe explicar fuentes mensuales, reversiones, identidad fuerte y diferencia entre CRM y finanzas.

No se cambió UI.

### Carril B — adaptador / seguridad

- adaptador actualizado a `orbit360-planillas-comisiones-source-adapter-v1.1`;
- root fix probado con 42/42;
- sin Orbit.store, Firestore, navegador, deploy ni producción.

### Carril C — datos reales A&S

- 19 archivos perfilados en paquete privado;
- 67 filas observadas;
- 65 candidatas CRM;
- 8 pares documentales exactos;
- ninguna fila real almacenada en el repositorio;
- ninguna escritura operacional.

## 9. Clasificación para Claude

```text
REPLICABLE_CLAUDE_ACUMULADO
```

Replicable:

- periodo mensual explícito sin fecha ficticia;
- deduplicación solo con identidad fuerte;
- separación CRM vs activación financiera;
- factura, planilla y banco como capas distintas;
- reversiones preservadas.

No enviar:

- archivos reales;
- nombres, pólizas o importes;
- códigos tenant;
- backend protegido;
- credenciales.

## 10. Estado

```text
SOURCE_DRYRUN_CLOSED
CRM_CANDIDATES_PREPARED
FINANCE_NOT_ACTIVATED
MAPFRE_HOLD
FICOHSA_FINANCE_HOLD
WRITES_0
```

## 11. Siguiente acción exacta

```text
validar el contrato canónico del siguiente gate read-only
→ preparar paquete privado para cruce de 65 candidatos contra pólizas/recibos/cobros LAB
→ comprobar coincidencias, faltantes y relaciones ambiguas
→ generar dry-run crear / omitir / requiere validación / hold
→ mantener finmovs, CxC, CxP y liquidaciones sin escritura
→ solicitar autorización separada únicamente si aparece una propuesta de escritura CRM elegible
```
