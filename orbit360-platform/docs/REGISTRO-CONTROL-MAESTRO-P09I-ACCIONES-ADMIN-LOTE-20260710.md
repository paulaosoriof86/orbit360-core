# Registro control maestro — P0.9i acciones administrativas del lote

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `CONTRATO_ADMIN_IMPLEMENTADO / SIN_EJECUCION_LAB_REAL / CERO_HABILITACION`

## Carril A — Prototipo/UX/Claude/Academia

Avance:

- flujo administrativo separado en cuatro momentos;
- roles por preview/ejecución/historial;
- confirmación reforzada;
- preview de documentos y referencias faltantes;
- última ejecución visible;
- estado de historial persistido/no persistido;
- requisitos Academia documentados.

Pendiente:

- formulario visible P0.9j;
- selección de documentos;
- captura de motivo;
- confirmación textual;
- resultados detallados por documento;
- diff interactivo;
- persistencia del historial desde UX administrativa;
- candidata Claude.

Claude no se solicita todavía.

## Carril B — Backend/contratos/seguridad

Avance:

```text
core/aseguradoras-batch-admin-actions-p09i.js
core/aseguradoras-runtime-bootstrap-p09f.js
modules/aseguradoras-knowledge-panel-p09f.js
```

Cerrado:

- preview tenant-scoped;
- selección dry-run/reanudación;
- actor y rol activo;
- motivo;
- fingerprint;
- frase de confirmación;
- dry-run sin persistencia;
- persistencia separada del historial;
- Operativo vs Admin;
- referencias sanitizadas;
- cero habilitación.

Pruebas:

```text
tools/orbit360-test-aseguradoras-batch-admin-actions-p09i.mjs
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
tools/orbit360-test-aseguradoras-knowledge-panel-p09f.mjs
```

Workflow:

```text
.github/workflows/orbit360-aseguradoras-batch-admin-p09i-smoke.yml
```

Pendiente:

- CI visible;
- ejecución con provider real;
- auditoría real en Firestore LAB;
- empalme del bootstrap;
- smoke navegador.

## Carril C — Fuentes/datos reales

Avance:

- el lote de once fuentes ya puede previsualizarse sin exponer referencias;
- los documentos reanudables se obtienen desde el historial;
- la acción administrativa no requiere IDs ni rutas manuales de Paula;
- las fuentes siguen asociadas a sus aseguradoras A&S.

Pendiente:

- referencias reales generadas por backend;
- primer dry-run real;
- revisión fuente por fuente;
- persistencia del historial;
- validación de reglas y presentaciones;
- bindings AseGuate automóvil/microbús;
- procesamiento secuencial del resto.

## Decisiones de rol

### Operativo

Puede:

```text
preview
dry-run
reanudar
revisar resultados
```

No puede:

```text
persistir historial global
persistir conocimiento
habilitar módulos
```

### Admin/Dirección/AdminTenant/SuperAdmin

Puede además persistir el historial metadata-only con doble confirmación.

### Asesor

No puede ejecutar acciones administrativas del lote.

## Estado de seguridad

Los estados y planes no contienen:

- rutas;
- referencias backend;
- URLs firmadas;
- tokens;
- secretos;
- binarios;
- PII.

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

## Estado real

```text
P0.9i core: implementado
bootstrap: actualizado
panel: actualizado
smoke: implementado
workflow: configurado

index.html: no modificado
provider: no conectado
dry-run real: no ejecutado
historial LAB: no persistido
conocimiento LAB: no persistido
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## Próxima acción

P0.9j:

```text
formulario administrativo visible
→ selección dry-run/reanudación
→ preview
→ motivo
→ confirmación reforzada
→ ejecución sin conocimiento
→ resultados
→ persistencia separada del historial
→ auditoría
```

La siguiente fase no debe habilitar Cotizador ni Comparativo.
