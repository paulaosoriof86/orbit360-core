# CIERRE READ-ONLY — PLANILLAS Y COMISIONES — DRY-RUN DE CINCO RELACIONES

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block11-planillas-comisiones-linkage-readonly-v20260801`  
**Entorno:** LAB read-only

## 1. Alcance

Después de cerrar la identidad de póliza y recibo, solo cinco filas del corte histórico de junio de 2026 quedaron con relación inequívoca:

```text
filas de fuente candidatas: 65
pólizas identificadas: 49
recibos identificados: 5
universo del dry-run de comisión: 5
```

Los 16 HOLD de póliza y los 44 HOLD de recibo permanecieron fuera del bloque.

## 2. Contrato canónico de destino

La auditoría confirmó que el importador P0 vigente no debe escribir las filas importadas en la colección genérica `comisiones`. Cada comisión validada propone exactamente un documento en:

```text
planillasComisiones
comisionesDevengadas
conciliacionesComisiones
```

Facturas, CxC, CxP, movimientos financieros y liquidaciones de asesores son etapas posteriores y permanecen deshabilitadas.

## 3. Planner reusable

Componente puro:

```text
orbit360-platform/core/planillas-comisiones-commission-dryrun-planner-p0.js
```

Controles principales:

- usa la comisión explícita de la fuente;
- no calcula ni infiere tasa;
- genera una clave idempotente por aseguradora, póliza, recibo, asesor, periodo e importe;
- distingue destino vacío, destino completo y estado parcial;
- propone tres documentos por comisión elegible;
- conserva separada la comisión A&S de la liquidación del vendedor;
- no incluye colección genérica, factura, CxC, CxP ni liquidación;
- produce cero escrituras.

Evidencia estática:

```text
run: 30719949803
job: 91421949720
artifact: 8824535956
artifact digest: sha256:3926cf3ed356d40872b3d00cda2025567a7eb936549e56eb8a30357873682914
checks: 32/32
resultado: STATIC_COMMISSION_DRYRUN_PLANNER_PASS
```

El primer contador esperado fue corregido de 33 a 32 antes de usarlo como evidencia. La incidencia fue `VALIDATOR_STALE` del workflow; no cambió el planner ni sus fixtures.

## 4. Dry-run vivo

```text
run: 30720089823
job: 91422311027
artifact: 8824579757
artifact digest: sha256:97439efee94ddf7b0ff438da4f89e9fae5463c68d8a4ec19ec768d13bf9c201e
HEAD auditado: e76f2cfb179468edbd8fe22b970d2010b64b8984
resultado: PLANILLAS_COMMISSION_DRYRUN_PASS
```

Resultado:

```text
relaciones evaluadas: 5
comisiones A&S candidatas: 5
HOLD u omisiones de comisión A&S: 0
documentos propuestos: 15
planillasComisiones: 5
comisionesDevengadas: 5
conciliacionesComisiones: 5
```

Los tres destinos estaban vacíos antes del dry-run y continuaron vacíos después:

```text
planillasComisiones: 0 → 0
comisionesDevengadas: 0 → 0
conciliacionesComisiones: 0 → 0
```

No existen duplicados ni estados parciales actuales.

## 5. Liquidación del vendedor

La comisión A&S y la comisión del vendedor fueron evaluadas por separado:

```text
vendedor listo o no aplicable: 2
HOLD de vendedor: 3
```

Los tres HOLD tienen la causa:

```text
HOLD_SELLER_ALIAS_NOT_CONFIGURED
```

Esto significa:

- la comisión A&S sí tiene póliza, recibo, fuente, periodo, moneda y valor explícito;
- el código de vendedor de la planilla no está configurado como alias del catálogo del tenant;
- no se aplicó el porcentaje 50% por defecto del motor;
- no se autorizó liquidación de asesor;
- el valor de vendedor de origen se preservaría únicamente como dato pendiente de validar.

Decisiones del dry-run:

```text
CREATE_AS_COMMISSION_DRYRUN: 2
CREATE_AS_COMMISSION_HOLD_SELLER: 3
```

## 6. Sellos exactos

```text
candidateSetDigest:
04c7da071ddadfe689e0137e730448ada36abe7aff6c228cd5abb0206c26c680

targetSnapshotDigest:
12b3763f976433e1e7e809f461dc835bca3a4c39b1d6dd1655e42a202e6cbf3f
```

Estos sellos permiten que un futuro gate de escritura rechace cualquier cambio de candidato, destino o snapshot sin exponer pólizas, IDs, importes o PII.

## 7. Contrato de una futura escritura

Una eventual escritura deberá limitarse a:

```text
5 comisiones A&S
15 documentos exactos
3 colecciones canónicas
1 operación atómica
```

Controles obligatorios:

1. ejecutar el gate canónico antes de secrets y Firestore;
2. verificar que el `candidateSetDigest` sea idéntico;
3. verificar que el `targetSnapshotDigest` sea idéntico y las tres colecciones continúen en cero;
4. crear exactamente cinco documentos por colección;
5. bloquear replay e idempotencia por `_sourceKey`;
6. preservar `liquidacionAsesorAutorizada: false` en los tres HOLD de vendedor;
7. no tocar `comisiones`, facturas, CxC, CxP, cobros, recibos, pólizas ni `finmovs`;
8. post-verificar 15/15 documentos y baseline;
9. si cualquier comprobación falla, eliminar exactamente los 15 documentos creados;
10. mantener producción y deploy fuera del bloque.

## 8. Controles preservados

```text
pólizas: 1373
recibosEsperados: 1294
cobros: 5
finmovs: 0
Firestore writes: 0
operational writes: 0
finance activated: false
browser: false
deploy: false
production: false
```

## 9. Estado contractual

```text
PLANILLAS_COMMISSION_DRYRUN_CLOSED
```

El request read-only fue consumido y su replay quedó bloqueado. No existe autorización de escritura.

## 10. Siguiente acción exacta

```text
obtener autorización separada para escritura LAB
→ armar gate controlado para los cinco candidatos sellados
→ snapshot y verificación de colecciones vacías
→ batch atómico de 15 documentos
→ post-verificación 15/15
→ rollback exacto si falla cualquier control
→ conservar tres liquidaciones de vendedor en HOLD
→ no activar finanzas, CxC, CxP ni producción
```
