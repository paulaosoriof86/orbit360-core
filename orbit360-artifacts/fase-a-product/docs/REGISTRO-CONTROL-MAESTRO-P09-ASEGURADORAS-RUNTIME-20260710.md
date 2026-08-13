# Registro control maestro — P0.9 runtime de conocimiento Aseguradoras

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `CONTRATOS_Y_WRITER_IMPLEMENTADOS / RUNTIME_NO_EMPALMADO / SIN_HABILITACION`

## Carril A — Prototipo/UX/Claude

Avance:

- read model definido;
- tabs y KPIs requeridos;
- wizard de carga/revisión;
- estados honestos;
- roles y seguridad UX;
- Academia por rol;
- paquete acumulado P0.9.

Pendiente:

- empalme runtime;
- primera fuente persistida;
- diseño Claude;
- visor/diff;
- historial visual;
- smoke navegador.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Avance:

```text
core/document-provider-registry-p09.js
core/aseguradoras-knowledge-runtime-p09.js
modules/aseguradoras-knowledge-p09.js
tools/orbit360-test-aseguradoras-knowledge-p09.mjs
.github/workflows/orbit360-aseguradoras-knowledge-p09-smoke.yml
```

Cerrado:

- registry de providers;
- política por tenant/tarea;
- estado `BACKEND_REQUIRED`;
- writer metadata-only;
- colecciones profundas;
- asociación a `aseguradoras.docs[]`;
- tenant isolation;
- rol activo;
- idempotencia;
- stale-plan guard;
- auditoría;
- read model;
- flags de habilitación forzados a false.

Pendiente:

- provider backend real;
- wire Drive/upload;
- carga segura en `index.html`;
- validación con store Firestore LAB;
- CI visible;
- smoke navegador.

## Carril C — Fuentes reales A&S

Avance:

- ocho Excel auditados y extraídos fuera del repositorio;
- tres PDFs auditados;
- asociación prevista por aseguradora/producto;
- AseGuate tarifario + dos presentaciones identificadas;
- Universales separado;
- errores/referencias legacy detectados;
- binding AseGuate automático bloqueado honestamente.

Pendiente:

- ejecutar las once fuentes a través de P0.9;
- registrar references Drive/upload;
- persistir manifests/proposals metadata-only;
- revisión humana;
- validar reglas y presentaciones;
- primer binding real revisable.

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
→ P0.9b empalme + primera persistencia real
→ Cotizador
→ Comparativo
→ Claude/Academia/smoke transversal
```

## No reabrir

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Activos;
- Cobros/Recibos/Cartera;
- Comisiones/CxC/CxP;
- auditoría general v110;
- habilitación antes de validación.

## Próximo bloque

P0.9b:

1. integrador seguro de scripts P0.4–P0.9;
2. adapter backend que invoque extractores Python desde referencia autorizada;
3. provider registry con estado real;
4. persistencia de una fuente A&S metadata-only;
5. read model real;
6. smoke de tenant/rol/auditoría;
7. repetir por lotes para las once fuentes;
8. no habilitar todavía Cotizador/Comparativo.

## Documentos relacionados

- `IMPLEMENTACION-P09-RUNTIME-CONOCIMIENTO-ASEGURADORAS-MULTITENANT-20260710.md`
- `REGISTRO-FUENTES-AYS-ASOCIACION-A-ASEGURADORAS-P09-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09-ASEGURADORAS-20260710.md`
