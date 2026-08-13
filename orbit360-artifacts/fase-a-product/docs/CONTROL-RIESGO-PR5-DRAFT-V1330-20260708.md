# CONTROL DE RIESGO PR #5 DRAFT V1330 — 2026-07-08

## Proposito

Evitar que el PR #5 sea interpretado como listo para merge, deploy o produccion mientras sigue acumulando backend LAB, empalmes, documentacion, tooling y pendientes locales.

Este documento no modifica codigo funcional.

## Estado observado del PR

PR:

```txt
#5 — draft: A&S backend LAB v104 — rama obligatoria + empalme seguro
```

Estado actual:

```txt
open: true
merged: false
draft: true
mergeable: false
base: main
head: ays/backend-tenant-lab-v99-20260703
head_sha: 6048d1d95a1e92e2754b42374c225bbee0b671eb
commits: 769
changed_files: 631
```

Lectura:

- Es un PR de continuidad, laboratorio y documentacion tecnica.
- No es un PR listo para merge.
- `mergeable: false` confirma que no debe tratarse como integrable sin revision/limpieza.
- El volumen de commits/archivos exige control por bloques, no merge global.

## Riesgos principales

### 1. Merge accidental a main

Riesgo:

- El PR contiene muchos cambios acumulados y documentacion de continuidad.
- No todos los bloques tienen smoke local/visual final.
- No debe llevarse a main como unidad completa sin estrategia de cierre.

Control:

- Mantener draft.
- No marcar ready for review.
- No merge.
- No deploy.
- No main.

### 2. Confusion entre documentacion avanzada y codigo validado

Riesgo:

- Se han documentado contratos, planes, gates, smokes y patrones, pero algunos requieren ejecucion local.
- Documentar no equivale a validar runtime.

Control:

- Cada documento debe indicar si es contrato, plan, tooling listo o validacion ejecutada.
- Equipo/Config gates siguen pendientes de patch local.
- M2/M3/M4 siguen pendientes de smoke.

### 3. HEAD local atrasado frente al remoto

Riesgo:

- Paula reporto un HEAD local anterior: `36d3afad316e3ecc4bf4ca46aa5227d87e3bd0d3`.
- El remoto ya avanzo a `6048d1d95a1e92e2754b42374c225bbee0b671eb` con documentacion v1330.

Control:

- Antes de PowerShell/patch, confirmar rama/head local.
- No aplicar patch si el worktree no esta sincronizado o si hay protegidos modificados.

### 4. Backend protegido pisado por prototipo o ZIP

Riesgo:

- El PR mezcla empalmes frontend y backend LAB protegido.
- Nuevos candidatos Claude podrian intentar reemplazar archivos protegidos.

Control:

- No aceptar ZIP/Claude sin auditoria forense.
- No copiar `index.html` completo sin plan.
- No tocar:
  - `orbit360-platform/data/store.js`
  - `orbit360-platform/data/store-firestore-lab.local.js`
  - `orbit360-platform/core/backend-lab-*`
  - `orbit360-platform/core/auth.js`
  - `orbit360-platform/core/importa.js`
  - `firestore.rules`
  - `tools/orbit360-*`
  - `orbit360-platform/index.html`

### 5. Integraciones o estados simulados como productivos

Riesgo:

- Modulos visibles pueden mostrar preparado/registrado como si fuera enviado/publicado/confirmado.
- Copy tecnico puede aparecer en Portal/Correo/Automatizaciones.

Control:

- Mantener copy honesto.
- No declarar activo lo que esta pendiente.
- Portal/Correo/Automatizaciones tienen pendientes de copy/gates no bloqueantes para M2/M3/M4, pero deben limpiarse antes de demo comercial/productiva.

## Orden seguro de cierre

### Fase inmediata local

1. Sincronizar/confirmar HEAD local.
2. Confirmar protegidos limpios.
3. Aplicar patch Equipo/Config v2 tolerante.
4. Ejecutar node checks.
5. Ejecutar contrato backend LAB.
6. Documentar cierre Equipo/Config.

### Fase smokes

1. Smoke M2 Marketing.
2. Smoke M3 Aseguradoras.
3. Smoke M4 Finanzas historico.
4. M5 Conciliaciones solo despues y con gates adicionales.

### Fase PR/merge futura

No hacer merge del PR #5 como bloque completo hasta definir estrategia:

- opcion A: dividir cambios por PRs mas pequenos;
- opcion B: cerrar rama LAB y abrir PR limpio por fase;
- opcion C: mantener PR #5 como rama laboratorio/documentacion y crear rama final separada para produccion.

La decision debe tomarse despues de smokes y validaciones locales.

## Criterios para mantener PR en draft

Debe seguir en draft mientras exista cualquiera de estos pendientes:

- Equipo/Config gates sin patch local validado.
- Backend LAB sin smoke local actualizado.
- M2/M3/M4 sin smoke.
- M5 conciliacion sin gates/motivo/bitacora.
- `mergeable: false`.
- archivos protegidos sin verificacion final.
- falta de estrategia para pasar de LAB a PR limpio.

## Estado final

Documento de control creado. No cambia codigo funcional. PR #5 debe permanecer draft y sin merge/deploy.
