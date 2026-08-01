# CIERRE READ-ONLY FINAL — COBROS / CONCILIACIÓN — 4 HOLD RATIFICADOS

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate de origen:** `block10.9-cobros-controlled-write-lab-v20260801`  
**Entorno:** LAB  
**Producción / deploy / main / merge:** no ejecutados

## 1. Estado final del corte de Cobros y Conciliación

```text
filas de pagos revisadas: 9
cobros aplicados y post-verificados: 5
filas residuales auditadas: 4
candidatos residuales elegibles: 0
HOLD ratificados: 4
nuevas escrituras: 0
```

Los cinco cobros ya aplicados conservan sus relaciones correctas con póliza y recibo. Los cuatro residuales no pueden aplicarse automáticamente con la evidencia vigente.

## 2. Preflight vivo del caso residual más prometedor

Una de las cuatro filas recibió evidencia adicional suficiente para justificar un preflight read-only en LAB, pero no una escritura.

Evidencia final:

```text
run: 30714297335
job: 91407132282
artifact: 8822846720
artifact digest: sha256:9e5166753de3153891fc0c113cadf571a81a1bca50e367f4603b7a46826077cc
HEAD: a0b9fb61de66e5919beefaeda7bf1298cd93e8cd
resultado: RESIDUAL_CANDIDATE_READONLY_HOLD
```

Controles que sí pasaron:

```text
póliza existe: sí
recibo existe: sí
snapshot de póliza: correcto
recibo único para la póliza/importe/serie: sí
cobro previo para el recibo: no
recibo ya conciliado: no
importe exacto en las fuentes actuales: sí
referencia secundaria confirmada por dos fuentes de aseguradora: sí
estado de póliza preservado: sí
finmovs: 0
```

Control que impidió la elegibilidad:

```text
único campo divergente: endoso
referencia del recibo vivo coincide con las dos fuentes de aseguradora: no
```

Por tanto, no corresponde modificar el recibo, completar la referencia por inferencia ni crear el cobro.

## 3. Incidencia de infraestructura corregida

El primer preflight no alcanzó Firestore porque el paquete privado nuevo no tenía permiso explícito de lectura para LAB.

```text
run: 30714072394
clasificación: ENVIRONMENT_FAILURE
fallo: PRIVATE_PACKAGE_DRIVE_404
Firestore leído: no
escrituras: 0
```

Se corrigió únicamente el permiso del archivo privado, conservando el mismo ID y los mismos hashes. No se modificaron datos, contrato de negocio ni producto.

## 4. Clasificación final de los residuales

### Residual 1

```text
clasificación: CROSS_POLICY_REFERENCE_CONFLICT_AND_AMOUNT_MISMATCH
decisión: HOLD
```

### Residual 2

```text
clasificación: LIVE_RECEIPT_ENDOSO_CONFLICTS_WITH_TWO_INSURER_SOURCES
decisión: HOLD_REQUIRES_AUTHORITATIVE_CORRECTION
```

### Residual 3

```text
clasificación: INSURER_STATUS_CONFLICT_AND_AMOUNT_MISMATCH
decisión: HOLD
```

### Residual 4

```text
clasificación: CURRENT_PERIOD_SOURCE_CONFLICT_AND_AMOUNT_MISMATCH
decisión: HOLD
```

## 5. Controles preservados

- request del gate 10.9 sellado y consumido;
- replay bloqueado;
- writer genérico de Cobros bloqueado;
- ninguna nueva autorización de escritura;
- ningún cobro residual creado;
- ningún recibo modificado;
- ninguna póliza reactivada;
- ningún `finmov` creado;
- cero deploy y producción intacta;
- evidencia sanitizada sin PII, pólizas, importes, IDs ni secretos.

## 6. Criterio de cierre del corte actual

La secuencia maestra es obligatoria:

```text
Cobros realizados
→ Conciliación
→ Planillas y comisiones
```

El corte actual de Cobros/Conciliación puede cerrarse de manera controlada porque:

- los cinco casos elegibles fueron aplicados y post-verificados;
- los cuatro residuales fueron investigados hasta agotar la evidencia disponible;
- cada residual conserva una causa explícita de `HOLD`;
- no existe candidato adicional elegible;
- los casos `HOLD` no se arrastrarán a Comisiones ni Finanzas.

Esto permite iniciar únicamente el inventario read-only de Planillas y Comisiones para los cinco casos ya conciliados, manteniendo los cuatro residuales abiertos en su ledger separado.

## 7. Carriles

### Carril A — frontend, UX y Academia

El estado visible debe permanecer `Pendiente de conciliación / Requiere corrección de fuente`, sin mostrar cobro o comisión inexistentes.

### Carril B — backend, seguridad y gates

El lifecycle quedó `CLOSED_RESIDUAL_CANDIDATE_PREFLIGHT`. No existe writer residual ni request de escritura.

### Carril C — datos reales A&S

Los cinco casos conciliados pueden participar en un análisis posterior de planillas/comisiones. Los cuatro `HOLD` quedan excluidos hasta recibir fuente autoritativa corregida.

## 8. Impacto Claude y Academia

Se conserva el patrón reusable:

- no inferir referencias secundarias;
- no aplicar un pago solo por coincidencia de importe;
- una referencia confirmada externamente debe coincidir también con el recibo vivo;
- `HOLD` no genera cobro, comisión ni movimiento financiero;
- fuentes corregidas reabren solo el caso afectado, no todo el lote.

## 9. Siguiente acción exacta

```text
iniciar inventario read-only de fuentes planilla_aseguradora y planilla_comisiones
→ limitar el universo inicial a los cinco cobros ya conciliados
→ perfilar archivos, hojas, periodos, moneda, país y campos de comisión
→ no calcular ni escribir comisión todavía
→ mantener los cuatro residuales fuera del bloque
→ preparar dry-run/diff antes de cualquier autorización futura
```
