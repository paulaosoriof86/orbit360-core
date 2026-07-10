# Registro control maestro — P0.9j Formulario administrativo del lote

Fecha: 2026-07-10  
Repo: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Merge/deploy/main: no autorizados

## Carril A — Prototipo, UX y Academia

### Avance visible

- Formulario aditivo preparado para Aseguradoras.
- Selector dry-run/reanudación.
- Selección de documentos por nombre y contexto.
- Motivo, preview, fingerprint y confirmación.
- Resultado de ejecución e historial separado.
- Requisitos Claude y Academia documentados.

### Estado

Preparado en código; no validado todavía en navegador LAB real.

### Pendientes

- smoke visual;
- accesibilidad y responsive;
- validación de copy y jerarquía;
- candidata Claude después del primer flujo real.

## Carril B — Backend protegido y contratos

### Avance visible

- Broker efímero de referencias P0.9j.
- Tickets con TTL, límite, actor/tenant/lote/documentos.
- Ticket consumido después de ejecución.
- Bootstrap actualizado a 28 dependencias.
- Preflight diferencia broker cargado y backend conectado.
- Workflow y smokes configurados.

### Protección

No se modificaron:

```text
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
core/auth.js
firestore.rules
```

### Pendientes

- bridge real de referencias;
- adaptador Drive/upload;
- comando backend LAB;
- ejecución visible de CI;
- persistencia real de historial.

## Carril C — Fuentes reales A&S

### Avance visible

- El formulario consume el lote ya configurado de once fuentes.
- No solicita IDs ni rutas manuales.
- AseGuate, BAM, Bantrab, Columna, Rural/Banrural y Universales permanecen separados según el directorio/configuración.

### Estado

Las fuentes reales todavía no se ejecutaron desde el formulario porque no existe bridge backend conectado.

### Pendientes

1. resolver referencias backend;
2. primer preview real de AseGuate;
3. primer dry-run real;
4. historial metadata-only;
5. validación de reglas y presentaciones;
6. bindings automóvil/microbús;
7. segundo gate cerrado hasta aprobación.

## Hallazgos y decisiones

### 1. Rutas manuales no aceptables

Necesidad: operar sin copiar enlaces técnicos.  
Esperado: backend resuelve referencias.  
Causa raíz: el runner necesita un archivo autorizado, pero la UI no debe conocer su ruta.  
Fix: broker efímero con ticket.  
Impacto: cero carga manual técnica.  
Estado: cerrado en contrato.

### 2. Contrato cargado no significa backend conectado

Necesidad: estados honestos.  
Esperado: distinguir broker instalado de método backend disponible.  
Fix: campos separados en preflight.  
Impacto: evita falso positivo de integración.  
Estado: cerrado.

### 3. Ejecución no debe guardar conocimiento

Necesidad: preservar revisión humana y segundo gate.  
Esperado: dry-run sin reglas/presentaciones/bindings operativos.  
Fix: formulario solo usa P0.9i y broker; historial separado.  
Impacto: Cotizador y Comparativo siguen bloqueados.  
Estado: cerrado.

### 4. Referencias no deben quedar en estado visual

Necesidad: privacidad y seguridad.  
Esperado: solo disponibilidad.  
Fix: referencias en closure y ticket efímero.  
Impacto: no llegan al DOM, store ni historial.  
Estado: cerrado en contrato; pendiente validar con bridge real.

## Inventario del bloque

```text
orbit360-platform/core/aseguradoras-source-reference-broker-p09j.js
orbit360-platform/modules/aseguradoras-batch-admin-form-p09j.js
orbit360-platform/core/aseguradoras-runtime-bootstrap-p09f.js

tools/orbit360-test-aseguradoras-source-reference-broker-p09j.mjs
tools/orbit360-test-aseguradoras-batch-admin-form-p09j.mjs
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs

.github/workflows/orbit360-aseguradoras-batch-form-p09j-smoke.yml

orbit360-platform/docs/IMPLEMENTACION-P09J-FORMULARIO-ADMIN-LOTE-ASEGURADORAS-20260710.md
orbit360-platform/docs/ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09J-FORMULARIO-20260710.md
orbit360-platform/docs/REGISTRO-CONTROL-MAESTRO-P09J-FORMULARIO-ADMIN-20260710.md
```

## Estado honesto consolidado

```text
formulario visible: implementado
broker efímero: implementado
smokes: definidos
workflow: configurado
index aplicado: no
runtime navegador validado: no
bridge referencias: no conectado
preview real: no
dry-run real: no
historial LAB real: no
conocimiento persistido: no
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## Siguiente acción

P0.9k:

```text
contrato backend de referencias
→ adapter Drive/upload
→ comandos LAB sin secretos
→ registro honesto del bridge
→ primer preview real AseGuate
→ dry-run sin conocimiento
→ historial metadata-only
→ recarga/read model
```

## Acción manual requerida

No requerida en este bloque.