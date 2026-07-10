# Registro control maestro — P0.6b/P0.6c

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `EXTRACCION_Y_RECONCILIACION_IMPLEMENTADAS / SIN_HABILITACION / SIN_MERGE_DEPLOY`

## Carril A — Prototipo/UX/Claude

Avance:

- requisitos del panel de revisión por hoja/rango;
- editor de mapping;
- visualización de clústeres;
- manejo de financiamiento global;
- reconciliación tarifa/cotización;
- estados y bloqueadores;
- rutas de Academia por rol.

Pendiente:

- UI funcional en Aseguradoras;
- historial y versionado visual;
- diff interactivo;
- preview de bindings;
- paquete Claude.

Claude no se solicita todavía.

## Carril B — Backend y contratos

Avance:

```text
tools/orbit360-extract-excel-rule-facts-p06b.py
core/excel-rule-proposal-adapter-p06b.js
core/tariff-quote-reconciliation-p06c.js
```

Cerrado:

- lectura de valores cacheados;
- evidencia hoja/rango;
- PII training;
- grupos pricing/financing/health/presentation/dimensions;
- propuestas compatibles con P0.6;
- financiamiento no asignado sin scope;
- reconciliación con tolerancia;
- bloqueo por dimensiones/base/evidencia;
- segundo gate conservado.

Pendiente:

- wire backend invocable;
- writer metadata-only;
- persistencia de manifiesto/propuestas/diff;
- auditoría backend;
- integración runtime en Aseguradoras;
- CI visible.

## Carril C — Fuentes reales

Avance:

- ocho libros ejecutados;
- manifiestos sanitizados generados fuera del repositorio;
- conteos y complejidad documentados;
- errores y referencias externas identificados;
- AseGuate dividido en tres grupos de producto y financiamiento global;
- contraste con PDFs automóvil/microbús;
- binding automático AseGuate bloqueado honestamente.

Pendiente:

- revisión humana de hechos y grupos;
- mapeo de componentes exactos;
- confirmar bases de gasto/IVA;
- resolver fórmulas/referencias dañadas;
- validar matrices Salud;
- confirmar scope de financiamiento;
- fuentes adicionales AseGuate para cerrar cálculo.

## Plan vigente

```text
CRM/Clientes cerrado
→ Aseguradoras como fuente primaria
→ P0.4 inventario
→ P0.5 wire/diff
→ P0.6 reglas
→ P0.6b hechos numéricos
→ P0.6c reconciliación
→ P0.7 PDF
→ P0.8 binding/gate
→ P0.9 wire + writer + revisión runtime Aseguradoras
→ Cotizador
→ Comparativo
→ Claude/Academia/smoke transversal
```

## No reabrir

- CRM/Clientes y dry-run;
- Pólizas/Activos;
- Cobros/Recibos/Cartera;
- Comisiones/CxC/CxP;
- auditoría general v110;
- empalme visual antes del wire backend.

## Siguiente bloque

P0.9 — operación controlada dentro de Aseguradoras:

1. provider registry backend para Excel/PDF;
2. referencia autorizada Drive/upload;
3. ejecución del router;
4. writer metadata-only mediante Orbit.store externo;
5. colecciones/records de manifiesto, propuesta, diff y binding;
6. auditoría;
7. permisos y rol activo;
8. historial/versionado;
9. read model para futura UI;
10. sin habilitar Cotizador/Comparativo.

## Documentos relacionados

- `IMPLEMENTACION-P06B-EXTRACCION-NUMERICA-EXCEL-MULTITENANT-20260710.md`
- `REPORTE-EJECUCION-SANITIZADA-OCHO-COTIZADORES-P06B-20260710.md`
- `DECISION-BINDING-ASEGUATE-TARIFA-PRESENTACION-BLOQUEADO-P06C-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P06B-P06C-20260710.md`
