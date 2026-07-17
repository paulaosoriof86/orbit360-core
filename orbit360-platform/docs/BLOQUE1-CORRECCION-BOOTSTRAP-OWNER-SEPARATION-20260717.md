# Bloque 1 — Corrección del bootstrap LAB y separación de owners

Fecha: 2026-07-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.3`  
Producción: no autorizada

## Bloque y carriles

- Bloque activo: **Cliente 360 + Aseguradoras LAB**.
- Carril A: frontend y UX preservados; no se modificaron los renderers.
- Carril B: se corrigió únicamente el bootstrap LAB y su separación de responsabilidades.
- Carril C: datos A&S preservados; no hubo reimportación ni escritura.

## Evidencia previa

El contrato `1.0.2` y el preflight v2 demostraron correctamente `VALIDATOR_STALE`:

- el workflow se detuvo en el paso `Preflight vinculante · contrato del gate y causa raíz`;
- todas las etapas posteriores quedaron `skipped`;
- no se resolvieron secrets;
- no se inicializó Firebase Admin;
- no se sincronizaron datos;
- no se publicó Hosting;
- no se instaló ni ejecutó Playwright;
- no se abrió navegador.

Esta evidencia confirmó que la metodología fail-closed funciona y permitió corregir la capa exacta sin tocar módulos ni datos.

## Clasificación

### Primera capa

`VALIDATOR_STALE`

El preflight anterior no inspeccionaba dependencias transitivas del runtime.

### Segunda capa

`FUNCTIONAL_DEFECT`

El bootstrap LAB mantenía cargas de artefactos ya retirados por el contrato vigente:

- `data/import-initial-profiles.js`;
- `modules/importar-initial-tenant-lab.js`;
- `modules/aseguradoras-candidate-actions.js`.

La carga de acciones candidatas además hacía que el guard de Auth asumiera una responsabilidad de Aseguradoras que corresponde a su owner canónico.

## Implementación

### `core/backend-lab-init.js`

Se retiraron las cargas automáticas de:

- perfiles iniciales;
- importador inicial del tenant.

Se preservaron:

- `backend-lab-advisor-write-bridge.js`;
- `backend-lab-auth-guard.js`;
- `backend-lab-import-readiness-guard.js`;
- `backend-lab-canonical-view-sync.js`;
- inicialización Firebase Hosting reservada;
- configuración tenant y feature flags vigentes.

Justificación: los artefactos iniciales fueron temporales para la carga controlada. Los datos ya persistidos deben consumirse por `Orbit.store`; no deben reinstalarse ni reactivarse en cada sesión.

### `core/backend-lab-auth-guard.js`

Se retiraron:

- función `loadCandidateActions`;
- carga dinámica de `aseguradoras-candidate-actions.js`;
- export del loader retirado.

Se preservaron:

- verificación de identidad LAB;
- login real;
- sincronización de rol y asesor canónico;
- reenganche de snapshots;
- estado honesto de sesión;
- reconstrucción de navegación posterior a autenticación.

### Registro del gate

`tools/orbit360-gate-contract-registry-v20260717.json` se actualizó a `1.0.3` con estado:

`ACTIVE_PENDING_PREFLIGHT`

El registro deja explícitos los tres artefactos retirados y todos los componentes preservados.

## Archivos no modificados

- `core/auth.js`;
- `core/legal.js`;
- `core/router.js`;
- `core/access-scope.js`;
- `data/store.js` y adaptadores;
- `modules/cliente360.js`;
- `modules/aseguradoras.js`;
- `firestore.rules`;
- datos, asesores, clientes y aseguradoras;
- workflow del gate.

## Datos y estados preservados

- Clientes: 414.
- Aseguradoras: 26.
- Asesores: 7.
- Pólizas, vehículos, recibos/cartera, cobros y `finmovs`: no cargados por este bloque.
- Relaciones dependientes de fuentes futuras: deben permanecer vacías de forma honesta.

## Claude / prototipo comercializable

### `REPLICABLE_CLAUDE_INMEDIATO`

- Ningún guard de autenticación puede cargar acciones o renderers de un módulo de negocio.
- Ningún bootstrap puede reactivar importadores o seeds temporales después de la migración inicial.
- Toda candidata debe declarar su grafo de scripts efectivo, no solo archivos propietarios.

### `REPLICABLE_CLAUDE_ACUMULADO`

Patrón reusable:

> Bootstrap carga infraestructura y owners canónicos. Las cargas temporales de migración se ejecutan solo por flujo explícito, versionado y auditable; nunca en cada sesión del tenant.

### `BACKEND_PROTEGIDO_NO_CLAUDE`

No entregar a Claude:

- Firebase LAB;
- credenciales y secrets;
- guard de identidad;
- detalles de snapshots;
- workflow y Playwright;
- IDs internos del tenant.

### `TEMPORAL_RETIRO`

Todo bridge o importador temporal debe declarar:

- owner;
- consumidor;
- bloque de creación;
- bloque de retiro;
- condición de desactivación;
- verificación de ausencia en el grafo runtime.

## Academia

`ACADEMIA_ACTUALIZAR` con una lección aplicada:

### Tema

**Separación entre autenticación, bootstrap e importación inicial.**

### Aprendizajes

- Auth valida identidad y sesión; no carga funciones de Aseguradoras.
- Bootstrap prepara infraestructura; no reejecuta migraciones.
- Importación inicial es una operación explícita con dry-run, diff, confirmación, auditoría y rollback.
- Un validador verde puede estar obsoleto si no inspecciona dependencias transitivas.
- Cuando el preflight detecta `VALIDATOR_STALE`, se congela producto y se corrige primero el contrato.

## Estado del plan

### Avance visible

- Preflight fail-closed probado.
- Grafo runtime declarado.
- Tres dependencias retiradas eliminadas.
- Auth, store, renderers y datos preservados.
- Contrato actualizado a `1.0.3`.

### Paso intermedio

Fue necesario detener el gate y reparar primero el validador porque ejecutar Firebase/Playwright sobre un grafo incompatible habría seguido produciendo síntomas engañosos.

### Pendiente inmediato

1. Obtener `GO_GATE_CONTRACT` del mismo preflight sobre el HEAD vigente.
2. Si el preflight señala otra referencia retirada, corregir solo esa referencia.
3. Solo con `GO_GATE_CONTRACT`, ejecutar una vez el mismo gate runtime.
4. Solo con evidencia sanitizada `ok:true`, realizar una revisión visual única de:
   - Dirección escritorio;
   - Operativo tableta;
   - Asesor móvil.

### Producción

No se abre Bloque 2 ni se autoriza producción. El Bloque 1 sigue activo hasta `ok:true`.
