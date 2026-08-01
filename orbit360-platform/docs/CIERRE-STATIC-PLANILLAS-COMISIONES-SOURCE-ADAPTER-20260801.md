# CIERRE STATIC — PLANILLAS Y COMISIONES — SOURCE ADAPTER

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Modo:** estático, fixtures sintéticos exclusivamente  
**Producción / deploy / Firestore / navegador:** no ejecutados

## 1. Resultado

El adaptador reusable de fuentes para Planillas y Comisiones cerró con:

```text
STATIC_ADAPTER_PASS
GO_STATIC_SOURCE_ADAPTER
```

Evidencia:

```text
run: 30714979430
job: 91408935488
artifact: 8823047350
artifact digest: sha256:f04f61a84e756eeb7b94f162cd4d8db55188f465b44c797ad18d0e2751d02508
HEAD auditado: a905a77a73c98dbf5ffa178209a66e8d84e1c31b
checks: 32/32 PASS
```

## 2. Implementación

Archivo reusable:

```text
orbit360-platform/core/planillas-comisiones-source-adapter-p0.js
```

Auditoría:

```text
tools/orbit360-test-planillas-comisiones-source-adapter-p0-v20260801.mjs
.github/workflows/orbit360-planillas-comisiones-source-adapter-static-v20260801.yml
.github/orbit360-triggers/planillas-comisiones-source-adapter-static-v20260801.json
```

El componente no está incluido en `index.html`, no modifica la UI y no se conecta todavía al importador productivo.

## 3. Capacidades comprobadas

```text
aliases mapeados: 20
fixtures: sintéticos
filas reales: 0
```

Campos conceptuales soportados:

- tipo;
- producto;
- póliza;
- relación de ingreso;
- fecha de pago;
- moneda;
- requerimiento;
- serie;
- factura;
- fecha de vencimiento;
- obligación;
- número de pago;
- asegurado;
- ramo;
- valor de factura;
- prima neta;
- comisión A&S/intermediario;
- vendedor;
- comisión de vendedor;
- referencia adicional.

Controles:

- país explícito;
- moneda explícita;
- periodo exacto;
- fecha normalizada;
- números con separador decimal/punto/coma;
- prima neta separada del total;
- comisión A&S separada de comisión del vendedor;
- tasa de comisión no inferida;
- duplicados omitidos;
- trazabilidad de archivo, hoja y fila;
- cero escrituras.

## 4. Decisiones de dry-run comprobadas

```text
CANDIDATE
REQUIERE_VALIDACION
HOLD_PERIOD_MISMATCH
OMIT_DUPLICATE
```

Una fila solo puede ser `CANDIDATE` cuando contiene país, moneda, periodo, fecha, póliza, prima neta y comisión del intermediario válidos.

Una fila de otro periodo queda en `HOLD_PERIOD_MISMATCH`, aunque coincidan póliza e importe.

## 5. Seguridad

La auditoría comprobó:

```text
realRowsUsed: 0
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

## 6. Incidencia metodológica

Los dos primeros runs se detuvieron antes de ejecutar las pruebas:

```text
run 30714867827: VALIDATOR_STALE
run 30714923492: VALIDATOR_STALE
```

Causa raíz:

El workflow buscaba palabras como `Firestore` y `Orbit.store` en el archivo completo. Esas expresiones aparecían únicamente en comentarios y metadatos que declaraban ausencia de acceso, por lo que el validador generaba falsos positivos.

Después de dos fallos se aplicó `STOP_RETRY`, se congeló el adaptador y se diagnosticó la capa exacta. Se corrigió únicamente el validador para retirar comentarios antes de analizar tokens de acceso. El adaptador no fue modificado durante la corrección.

## 7. Relación con fuentes reales

El adaptador está listo como componente reusable, pero no existe todavía una fuente elegible del periodo exacto para los cinco cobros conciliados:

```text
Mapfre julio 2026: fuente no localizada
Aseguradora General: planilla de comisión no localizada
casos con fuente exacta: 0/5
```

La planilla Mapfre de junio de 2026 sirve como referencia de esquema, no como fila aplicable. La planilla “Julio” localizada corresponde a 2020 y quedó excluida.

## 8. Carriles

### Carril A — frontend, UX y Academia

Sin cambios de UI. Academia y patrón Claude ya documentan estados honestos, periodo exacto y `SOURCE_MISSING`.

### Carril B — backend y seguridad

Solo se añadió un adaptador puro, desconectado y sin acceso al store. No existe writer ni gate operativo.

### Carril C — datos reales A&S

Cero filas reales procesadas y cero comisiones creadas. Los cinco cobros conservan estado conciliado sin comisión confirmada.

## 9. Siguiente acción exacta

```text
obtener planilla Mapfre del periodo julio de 2026
→ obtener planilla de comisiones de Aseguradora General para los tres casos
→ verificar archivo, hoja, fila, país, moneda y periodo
→ ejecutar el adaptador en paquete privado read-only
→ generar dry-run crear / omitir / requiere validación
→ solo después evaluar autorización de escritura
```

El componente no debe conectarse a la plataforma ni recibir datos reales antes de esas fuentes.
