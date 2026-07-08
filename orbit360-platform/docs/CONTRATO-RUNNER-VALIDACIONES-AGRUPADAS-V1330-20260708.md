# Contrato — runner de validaciones agrupadas v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Reducir trabajo manual cuando llegue la candidata Claude o cuando se cierre un bloque funcional, agrupando validaciones locales en un solo comando corto.

## Archivo creado

```txt
tools/orbit360-run-validaciones-agrupadas-v1330.mjs
```

## Uso futuro

Sin candidata Claude:

```powershell
node tools/orbit360-run-validaciones-agrupadas-v1330.mjs
```

Con candidata Claude extraída:

```powershell
node tools/orbit360-run-validaciones-agrupadas-v1330.mjs --candidate "RUTA_CANDIDATA_EXTRAIDA"
```

## Qué valida

- Rama local correcta.
- Archivos protegidos modificados antes del runner.
- `node --check` de módulos críticos si existen:
  - Portal.
  - Cobros.
  - Cliente360.
  - Finanzas.
  - Equipo.
  - Configuración.
- `node --check` de tooling nuevo.
- Contrato backend LAB existente.
- Tests sintéticos de documentos/storage.
- Validador Portal/Cobros/Cliente360.
- Auditor de candidata Claude si se pasa ruta.

## Qué reporta

Crea reportes locales en:

```txt
_orbit360_reports/validaciones_agrupadas_v1330_<timestamp>.md
_orbit360_reports/validaciones_agrupadas_v1330_<timestamp>.json
```

## Qué NO hace

- No commit.
- No push.
- No merge.
- No deploy.
- No main.
- No producción.
- No Firestore writes.
- No modifica candidata.
- No empalma archivos.

## Metodología Paula

Este runner existe para mantener 0 manual salvo indispensable. Cuando toque validación local, debe pedirse un solo comando corto, no varios bloques largos.

## Impacto Claude/prototipo

No aplica como UX directa. Sí aplica como restricción de entrega: toda candidata Claude debe poder pasar auditoría agrupada antes de empalmar.

## Estado

Runner agregado y documentado. Pendiente ejecución local solo cuando sea indispensable.