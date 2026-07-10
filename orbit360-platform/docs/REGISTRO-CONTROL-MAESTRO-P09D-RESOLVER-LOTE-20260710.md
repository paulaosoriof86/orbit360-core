# Registro control maestro — P0.9d resolver y lote

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `RESOLVER_Y_BATCH_IMPLEMENTADOS / LOTE_AYS_DEFINIDO / SIN_ESCRITURA_OPERATIVA`

## Carril A — Prototipo/UX/Claude

Avance:

- vista de lote definida;
- estados de referencia/dry-run/persistencia separados;
- errores traducibles documentados;
- roles y Academia;
- lote A&S agrupado por aseguradora/producto.

Pendiente:

- UX real;
- ejecución desde plataforma;
- progreso/reintento;
- reporte visual;
- candidata Claude.

## Carril B — Backend/seguridad

Avance:

```text
tools/orbit360-document-source-resolver-p09d.mjs
tools/orbit360-document-batch-plan-p09d.mjs
tools/orbit360-test-document-source-resolver-p09d.mjs
tools/orbit360-test-document-batch-plan-p09d.mjs
.github/workflows/orbit360-document-source-resolver-p09d-smoke.yml
```

Cerrado:

- lookup de referencia;
- tenant/aseguradora/documento;
- status/expiración;
- task/purpose;
- single-use;
- política sensible;
- auditoría sin ruta;
- duplicados de documento/versión;
- duplicados de fileRef;
- resumen por aseguradora;
- ejecución secuencial dry-run;
- cero apply/habilitación.

Pendiente:

- repositorio real de referencias;
- montaje/descarga temporal;
- integración con Drive/upload;
- lifecycle/cleanup;
- empalme runtime;
- Firestore LAB;
- CI visible.

## Carril C — Fuentes reales

Avance:

- lote inicial de 11 fuentes definido;
- 8 Excel y 3 PDF;
- agrupación por seis familias de aseguradora propuesta;
- orden de procesamiento;
- validaciones previas;
- casos ambiguos identificados.

Pendiente:

- fileRefs reales;
- IDs definitivos del directorio;
- confirmar Columna;
- confirmar Banrural/Aseguradora Rural;
- ejecutar dry-run completo;
- persistir metadata en LAB;
- revisar cada manifiesto/propuesta.

## Plan vigente actualizado

```text
CRM/Clientes cerrado
→ Aseguradoras fuente primaria
→ P0.4 inventario
→ P0.5 wire/diff
→ P0.6 reglas
→ P0.6b extracción numérica
→ P0.6c reconciliación
→ P0.7 PDF
→ P0.8 binding/gate
→ P0.9 registry/writer/read model
→ P0.9b bridge/integrador
→ P0.9c runner backend
→ P0.9d resolver + batch dry-run
→ P0.9e empalme LAB + referencias reales + persistencia metadata
→ revisión por lotes
→ Cotizador
→ Comparativo
→ Claude/Academia/smoke transversal
```

## No reabrir

- CRM/Clientes;
- Pólizas/Cobros/Cartera/Comisiones;
- auditoría general v110;
- backend protegido;
- habilitación desde el lote;
- carga de datos reales sin fileRef autorizada.

## Siguiente bloque

P0.9e:

1. contrato/adapter de repositorio de referencias;
2. simulador LAB de Drive/upload con metadata ficticia;
3. dry-run real del integrador sobre branch checkout;
4. validación de orden y mojibake;
5. empalme controlado si pasa;
6. provider bridge en LAB;
7. primera persistencia metadata-only en Firestore LAB;
8. read model y auditoría;
9. rollback;
10. preparar ejecución del lote de once fuentes.

## Archivos relacionados

- `IMPLEMENTACION-P09D-RESOLVER-REFERENCIAS-Y-LOTE-DOCUMENTAL-20260710.md`
- `PLAN-LOTE-INICIAL-11-FUENTES-AYS-P09D-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09D-LOTE-20260710.md`
