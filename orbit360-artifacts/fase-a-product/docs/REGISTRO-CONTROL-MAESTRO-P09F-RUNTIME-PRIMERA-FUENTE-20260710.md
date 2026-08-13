# Registro control maestro — P0.9f runtime y primera fuente

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `IMPLEMENTADO_EN_RAMA / INDEX_NO_APLICADO / FIRESTORE_LAB_NO_ESCRITO`

## Carril A — Prototipo/UX/Claude

Avance:

- panel aditivo visible definido;
- estados de runtime, provider, snapshots y preflight;
- métricas de fuentes y conocimiento;
- primera fuente planificada;
- requisitos Claude/Academia acumulados.

Pendiente:

- candidata visual final;
- wizard de carga;
- revisión/diff interactivos;
- confirmación de plan/persistencia;
- historial y segundo gate visibles.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Avance:

```text
core/aseguradoras-runtime-bootstrap-p09f.js
core/aseguradoras-first-source-orchestrator-p09f.js
modules/aseguradoras-knowledge-panel-p09f.js
data/tenant-alianzas-soluciones-first-source-p09f.js
```

Cerrado:

- entrypoint único;
- contexto LAB/tenant;
- carga secuencial;
- deduplicación;
- reintento;
- provider honesto;
- primera fuente dry-run;
- confirmación separada;
- gate P0.9e;
- read model;
- panel read-only;
- integrador reducido a dos scripts.

Pendiente:

- empalme aplicado;
- provider real;
- persistencia LAB;
- recarga navegador;
- binding real;
- CI visible.

## Carril C — Fuentes reales

Fuente actual:

```text
Tasas AseGuate.xlsx
```

Estado:

- auditada fuera del repositorio;
- plan tenant creado;
- documento lógico creado;
- referencia backend pendiente;
- no persistida en Firestore LAB;
- no habilitada.

No contiene tasas reales dentro del plan o core.

## Decisiones que no deben reabrirse

- Banrural = Aseguradora Rural;
- Columna resuelve contra Seguros Columna;
- IDs internos automáticos;
- referencias generadas por backend;
- AseGuate: gasto de emisión 5% sobre prima neta;
- AseGuate: IVA 12% sobre subtotal gravable;
- Cotizador y Comparativo deshabilitados hasta segundo gate.

## No reabrir

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Activos;
- Cobros/Cartera;
- Comisiones/CxC/CxP;
- auditoría general v110.

## Estado honesto

```text
código P0.9f: implementado
panel: implementado
workflow: configurado
index.html: intacto
provider: no confirmado
primera fuente Firestore LAB: no escrita
read model real: no comprobado
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## Próxima acción

P0.9g:

1. comprobar CI;
2. aplicar integrador en LAB;
3. comprobar panel;
4. resolver referencia backend;
5. persistir primera fuente metadata-only;
6. recargar;
7. verificar fuente/manifiesto;
8. ejecutar reglas/presentaciones AseGuate;
9. mantener segundo gate cerrado;
10. preparar lote de once fuentes.
