# Registro control maestro — P0.9c runner backend documental

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `RUNNER_Y_BRIDGE_IMPLEMENTADOS / PRIMER_DRY_RUN_AISLADO_OK / STORE_OPERATIVO_SIN_CAMBIOS`

## Carril A — Prototipo/UX/Claude

Avance:

- estados del runner definidos;
- wizard carga/revisión documentado;
- panel de evidencia y diff requerido;
- mensajes operativos para errores backend;
- roles y rutas de Academia;
- primer caso A&S traducido a UX futura.

Pendiente:

- candidata Claude;
- wizard real;
- visor de progreso;
- review/diff interactivo;
- historial visual;
- estado de providers.

Claude no se solicita todavía.

## Carril B — Backend/seguridad

Avance:

```text
tools/orbit360-document-backend-runner-p09c.mjs
tools/orbit360-document-backend-bridge-p09c.mjs
tools/orbit360-test-document-backend-runner-p09c.mjs
tools/orbit360-test-document-backend-bridge-p09c.mjs
tools/orbit360-test-document-pipeline-p09c.mjs
.github/workflows/orbit360-document-backend-runner-p09c-smoke.yml
```

Cerrado:

- resolución dentro de roots autorizados;
- realpath y bloqueo de escape;
- SHA-256;
- correspondencia tarea/extensión;
- ejecución sin shell;
- timeout;
- directorio temporal privado;
- hints/directorio sanitizados;
- invocación de extractores P0.6b/P0.7b;
- manifest directo al registry;
- metadata de ejecución;
- training/operational;
- cero habilitación;
- smoke end-to-end con store inyectado.

Pendiente:

- resolver real Drive/upload;
- endpoint/callable/host backend;
- empalme P0.9 en index;
- Firestore LAB;
- CI visible;
- observabilidad backend.

## Carril C — Fuentes reales

Avance:

- tarifario real AseGuate utilizado en dry-run aislado del wire;
- ruta/hash/preflight comprobados;
- asociación tenant/aseguradora/documento comprobada;
- fuente, manifiesto y propuesta visibles en read model aislado;
- auditoría comprobada;
- cero activación.

Resultado:

```text
sources: 1
manifests: 1
proposals: 1
tariffRules: 0
presentations: 0
bindings: 0
pendingValidation: 2
enabledCotizador: 0
enabledComparativo: 0
```

Pendiente:

- ejecutar runner con extractores reales desde backend host;
- persistir primera fuente en Firestore LAB;
- repetir por lotes las once fuentes;
- revisar reglas/presentaciones/bindings;
- completar evidencia AseGuate.

## Hallazgo P0 corregido

### Sobre de resultado incompatible

Problema:

El runner devolvía:

```text
{ ok, code, result, audit }
```

El service P0.9 esperaba recibir el manifiesto directamente desde el provider.

Impacto:

- adapter Excel no encontraba `document`;
- mapping template quedaba incompleto;
- persistencia podía guardar un sobre técnico en vez del manifiesto.

Corrección:

- el bridge P0.9c devuelve `outcome.result`;
- conserva `runnerExecution` como metadata;
- registry/service reciben el contrato esperado.

Estado: `CORREGIDO_Y_CUBIERTO_POR_SMOKE`.

## Plan vigente

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
→ P0.9d resolver + empalme + Firestore LAB
→ carga por lotes de fuentes A&S
→ Cotizador
→ Comparativo
→ Claude/Academia/smoke transversal
```

## No reabrir

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Activos;
- Cobros/Cartera/Comisiones;
- auditoría general v110;
- backend protegido;
- habilitación antes de segundo gate.

## Siguiente bloque

P0.9d:

1. contrato de resolver Drive/upload;
2. adapter host/backend para montar archivos autorizados;
3. dry-run del integrador contra index real;
4. validación de orden y UTF-8;
5. empalme seguro si todas las validaciones pasan;
6. provider registrado en LAB;
7. primera persistencia Firestore LAB metadata-only;
8. verificación read model/auditoría;
9. rollback probado;
10. lote de once fuentes todavía sin habilitación.

## Documentos relacionados

- `IMPLEMENTACION-P09C-RUNNER-BACKEND-DOCUMENTAL-20260710.md`
- `REPORTE-DRY-RUN-PRIMERA-FUENTE-ASEGUATE-P09C-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09C-RUNNER-20260710.md`
