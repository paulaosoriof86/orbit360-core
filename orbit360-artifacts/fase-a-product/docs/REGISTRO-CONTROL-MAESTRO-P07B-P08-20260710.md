# Registro control maestro — P0.7b/P0.8

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `MANIFIESTOS_ROUTER_BINDING_GATE_IMPLEMENTADOS / SIN_RUNTIME_WRITE / SIN_MERGE_DEPLOY`

## Carril A — Prototipo/UX/Claude

Avance:

- wizard de carga y análisis definido;
- estados de pipeline;
- configuración IA por tarea;
- visor/evidencia;
- vínculos y targets separados;
- segundo gate;
- Academia multirol documentada.

Pendiente:

- candidata visual;
- runtime Aseguradoras;
- preview/diff interactivo;
- configuración provider real;
- historial/gate visual.

Claude aún no se solicita.

## Carril B — Backend/seguridad

Implementado:

```text
tools/orbit360-extract-pdf-manifest-p07b.py
core/document-intelligence-router-p08.js
core/knowledge-binding-gate-p08.js
core/knowledge-binding-policy-p08.js
```

Smokes/workflows implementados:

```text
tools/orbit360-test-extract-pdf-manifest-p07b.py
tools/orbit360-test-document-intelligence-router-p08.mjs
tools/orbit360-test-knowledge-binding-gate-p08.mjs
tools/orbit360-test-knowledge-binding-policy-p08.mjs
.github/workflows/orbit360-pdf-manifest-p07b-smoke.yml
.github/workflows/orbit360-document-intelligence-router-p08-smoke.yml
.github/workflows/orbit360-knowledge-binding-gate-p08-smoke.yml
```

Pendiente:

- provider/backend invocable desde referencia;
- writer externo;
- auditoría persistida;
- empalme index/runtime;
- retiro del camino documental legacy del frontend;
- CI visible.

## Carril C — Fuentes reales

Avance:

- tres PDFs reales procesados fuera del repositorio;
- aseguradoras separadas correctamente;
- automóvil/microbús separados;
- páginas vacías detectadas;
- PII redactada;
- manifests no cargados al repositorio.

Pendiente:

- almacenar manifests en backend controlado;
- diff automático real;
- P0.6b numérico por hoja/rango;
- vínculos reales con reglas;
- validación administrativa;
- más ejemplos por producto/vehículo;
- Drive.

## Hallazgos P0 registrados

- PII en bloque posterior a etiqueta;
- umbral de página sparse;
- país/moneda obligatorios;
- moneda adicional por configuración;
- workflow con quoting frágil;
- `core/ia.js` legacy no apto como provider productivo.

## No reabrir

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Cobros/Cartera;
- Comisiones/CxC/CxP;
- auditoría general v110.

## Secuencia vigente

```text
P0.6b propuestas Excel con evidencia
+ wire/provider P0.7b/P0.8
→ primer binding real validado
→ writer metadata-only
→ runtime Aseguradoras
→ Cotizador
→ Comparativo
→ Claude/Academia/smoke transversal
```

## Próxima acción

Cerrar P0.6b con manifiestos/propuestas numéricas sanitizadas de los ocho libros Excel y vincular primero:

- AseGuate automóvil;
- AseGuate microbús;
- después demás aseguradoras/productos.

No habilitar hasta writer, revisión y gate.
