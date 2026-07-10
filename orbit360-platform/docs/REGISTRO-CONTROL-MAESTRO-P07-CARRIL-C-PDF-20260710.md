# Registro control maestro — P0.7 Carril C cotizaciones PDF

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `ADAPTER_P07_IMPLEMENTADO / PROVIDER_PENDIENTE / SIN_MERGE_DEPLOY`

## Fuente real usada

Tres PDFs recibidos en la conversación actual:

- dos cotizaciones AseGuate;
- una cotización Seguros Universales.

Los PDFs y su PII no se subieron al repositorio.

## Carril A — Prototipo/UX/Claude

Avance:

- wizard reusable definido;
- visor con páginas/bboxes;
- matching visual;
- familia/variante;
- páginas vacías;
- PII training/operational;
- requisitos de AseGuate y Universales;
- Academia por rol.

Pendiente:

- candidata Claude;
- visor real;
- diff interactivo;
- tabs de fuente/presentación/versión;
- preview de impresión;
- integración Cotizador/Comparativo.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Avance:

```text
core/pdf-quote-adapter-p07.js
tools/orbit360-test-pdf-quote-adapter-p07.mjs
.github/workflows/orbit360-pdf-quote-adapter-p07-smoke.yml
```

Cerrado:

- provider request;
- bloques/páginas/secciones;
- matching de aseguradora;
- redacción training;
- familia/variante;
- diff;
- páginas vacías;
- compatibilidad con esquema P0;
- segundo gate.

Pendiente:

- provider backend real;
- CI visible;
- wire Aseguradoras;
- writer externo;
- gate de habilitación;
- smoke navegador.

## Carril C — Datos/fuentes reales

Avance:

- lectura visual y textual de tres PDFs;
- clasificación correcta de aseguradoras;
- dos variantes AseGuate;
- familia Universales separada;
- diferencias de estructura y producto;
- estado parcial de presentación AseGuate.

Pendiente:

- manifiesto sanitizado generado por provider;
- diff real automático;
- asociación de variantes con tarifario P0.6;
- más ejemplos AseGuate por categoría;
- validación humana;
- Drive.

## Estado del plan

No se reabre:

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Cobros/Cartera/Comisiones;
- auditoría general v110.

Secuencia vigente:

```text
P0.6b manifiestos Excel
+ P0.7b provider/manifiestos PDF
→ gate de habilitación
→ runtime Aseguradoras
→ Cotizador
→ Comparativo
→ Claude/Academia/smoke transversal
```

## Próxima acción

P0.7b/P0.6b convergente:

1. implementar provider backend o stub controlado;
2. generar manifiestos sanitizados de Excel y PDF;
3. producir diff real;
4. vincular presentación PDF con reglas tarifarias por combinación;
5. definir gate de habilitación;
6. no activar todavía Cotizador/Comparativo.

## Archivos relacionados

- `AUDITORIA-FORENSE-COTIZACIONES-PDF-ASEGUATE-UNIVERSALES-P07-20260710.md`
- `IMPLEMENTACION-P07-ADAPTER-PDF-COTIZACIONES-REUSABLE-20260710.md`
- `CONTRATO-PROVEEDOR-EXTRACCION-PDF-P07-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P07-PDF-20260710.md`
