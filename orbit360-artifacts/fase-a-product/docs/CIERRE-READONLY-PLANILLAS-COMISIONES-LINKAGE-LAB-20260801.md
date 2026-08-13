# CIERRE READ-ONLY — PLANILLAS Y COMISIONES — LINKAGE LAB

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block11-planillas-comisiones-linkage-readonly-v20260801`  
**Contrato:** `11.0.0`

## 1. Alcance ejecutado

Se cruzó el corte privado de planillas de junio de 2026 contra las colecciones vivas de LAB:

```text
polizas
recibosEsperados
cobros
finmovs
```

El objetivo fue clasificar coincidencias y bloqueos para CRM. No se autorizó ni ejecutó ninguna escritura de comisiones, CxC, CxP, liquidaciones, cobros o movimientos financieros.

## 2. Fuente cerrada

```text
archivos recibidos: 19
paquetes de fuente: 10
filas observadas: 67
candidatas CRM: 65
omitidas por comisión cero: 2
candidatas con fecha exacta: 34
candidatas de periodo mensual: 29
reversiones preservadas: 2
periodo: 2026-06
```

Los archivos reales y sus filas permanecieron fuera del repositorio. Solo se versionó evidencia sanitizada.

## 3. Gate canónico y evidencia

```text
run: 30718081323
job: 91417072747
artifact: 8823967179
artifact digest: sha256:52ff1ed73e16bf012ce438f0f3c3f50aeaaadb1da4a0d575891424a1683a73f6
HEAD auditado: 55b6f969611139a54334c8ee455a96c23137fb8b
resultado: PLANILLAS_COMISIONES_LINKAGE_READONLY_PASS
clasificación: GO_LAB_PLANILLAS_COMISIONES_LINKAGE_READONLY
```

El gate canónico pasó antes de leer secrets y Firestore.

## 4. Baseline preservado

```text
polizas: 1373
recibosEsperados: 1294
cobros: 5
finmovs: 0
```

No se modificó ningún contador.

## 5. Resultado del linkage

```text
filas procesadas: 65
póliza única: 10
póliza no encontrada: 29
póliza ambigua: 26
```

Por tanto, 55 filas quedaron detenidas en la capa de identidad de póliza y no pueden promoverse todavía.

Dentro de las 10 filas con póliza única:

```text
póliza + recibo único por referencia: 0
póliza + recibo único por prima neta: 2
recibo relacionado pero no resuelto: 7
sin relación de recibo: 1
cobro relacionado: 0
```

Decisiones sanitizadas:

```text
HOLD_POLICY_NOT_FOUND: 29
HOLD_POLICY_AMBIGUOUS: 26
HOLD_RECEIPT_AMBIGUOUS: 4
LINK_POLICY_RECEIPT_READONLY: 2
LINK_POLICY_ONLY_RECEIPT_UNRESOLVED: 3
LINK_POLICY_ONLY_NO_RECEIPT_RELATION: 1
```

## 6. Interpretación correcta

El resultado es un PASS técnico y contractual del cruce read-only, no una autorización de escritura.

Las 65 filas son fuentes válidas del corte, pero solo dos alcanzaron una relación única póliza–recibo con la información actualmente disponible en LAB. Ninguna se vinculó a los cinco cobros actuales porque esos cobros corresponden al corte conciliado posterior y las planillas procesadas corresponden a junio.

No se forzaron coincidencias por nombre, importe aproximado, asegurado o similitud textual.

## 7. Incidencia previa y causa raíz

El primer run fue:

```text
run: 30717963030
job: 91416756957
artifact: 8823933228
resultado: DATA_CONTRACT_FAILURE
causa: PACKAGE_LOGICAL_SHA
Firestore leído: no
escrituras: 0
```

El paquete físico era exacto, pero el hash lógico se había calculado con serialización de Python mientras el contrato exigía canonicalización estable de Node.

Se corrigieron exclusivamente:

- hash lógico del paquete privado;
- hash físico resultante;
- lifecycle, engine, workflow y marker asociados.

No se cambiaron las filas, reglas de enlace ni datos de LAB. La repetición única pasó correctamente.

## 8. Hallazgos por fuente

### Identidad de póliza

La mayor barrera es estructural:

```text
29 pólizas no localizadas
26 números con más de una coincidencia posible
```

Debe distinguirse entre:

- formato o alias del número de póliza;
- prefijos y separadores de aseguradora;
- renovaciones o variantes históricas;
- pólizas realmente ausentes del universo importado;
- números parciales que coinciden con más de una póliza.

### Recibos

Ocho de las diez pólizas únicas todavía requieren aclarar la relación con recibos. La ausencia de referencia exacta no puede resolverse usando únicamente prima o nombre.

### Mapfre

La fuente entregada sigue siendo un paquete HTML incompleto. La factura se conserva, pero el detalle no puede procesarse como planilla autosuficiente.

### Ficohsa

La fila puede permanecer como fuente CRM read-only. Sigue faltando la factura para cualquier promoción financiera posterior.

## 9. Carriles

### Carril A — CRM / UX / Academia

- corte de junio perfilado;
- estados honestos definidos;
- dos relaciones póliza–recibo identificadas read-only;
- UI no modificada;
- Academia actualizada con periodo mensual, identidad fuerte y separación CRM/finanzas.

### Carril B — backend / seguridad

- gate canónico block11 registrado;
- paquete privado con hash físico y lógico;
- evidencia sanitizada;
- cero escrituras, navegador, deploy o producción.

### Carril C — datos reales A&S

- 19 archivos procesados;
- 65 candidatas preservadas;
- 55 HOLD de identidad de póliza;
- 8 casos adicionales pendientes de resolver recibo;
- cero datos reales almacenados en GitHub.

## 10. Estado

```text
SOURCE_DRYRUN_CLOSED
STATIC_ADAPTER_PASS_42_OF_42
LAB_LINKAGE_READONLY_PASS
POLICY_IDENTITY_HOLDS_55
UNIQUE_POLICY_RECEIPT_LINKS_2
COBRO_LINKS_0
FINANCE_NOT_ACTIVATED
WRITES_0
PRODUCTION_NOT_TOUCHED
```

## 11. Siguiente acción exacta

```text
analizar read-only los 55 HOLD de identidad de póliza
→ separar alias/formato, renovación/histórico, ausencia real y ambigüedad
→ corregir únicamente el contrato de normalización si existe evidencia
→ revalidar los 55 casos sin tocar las 10 coincidencias ya clasificadas
→ después resolver los 8 recibos pendientes
→ generar un nuevo dry-run sanitizado
→ solicitar autorización separada solo si aparecen escrituras CRM inequívocas
```
