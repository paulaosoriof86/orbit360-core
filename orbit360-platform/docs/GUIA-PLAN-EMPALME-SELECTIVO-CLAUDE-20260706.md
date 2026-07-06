# Guía — Plan empalme selectivo Claude

**Fecha:** 2026-07-06  
**Script:** `tools/orbit360-plan-empalme-selectivo-claude.mjs`  
**Estado:** plan-only; no copia archivos, no modifica repo, no deploy.

---

## 1. Objetivo

Generar un plan de empalme selectivo para una candidata Claude extraída, clasificando archivos como:

```txt
BLOQUEAR_AUTO
REVISAR_MANUAL
CANDIDATO_EMPAlME_SELECTIVO
```

El plan evita empalmar completo un ZIP cuando trae `index.html`, backend protegido, copy bloqueante o archivos que requieren diff manual.

---

## 2. Uso local

Desde la raíz del repo:

```powershell
node tools/orbit360-plan-empalme-selectivo-claude.mjs --candidate "C:\ruta\a\candidata-extraida"
```

Genera reportes en:

```txt
_orbit360_reports/PLAN-EMPALME-SELECTIVO-CLAUDE-*.json
_orbit360_reports/PLAN-EMPALME-SELECTIVO-CLAUDE-*.md
```

---

## 3. Qué bloquea automáticamente

```txt
index.html
firestore.rules
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
tools/orbit360-*
copy bloqueante en archivos activos
```

---

## 4. Qué exige revisión manual

```txt
core/config.js
core/importa.js
data/academia-plus.js
data/seed.js
docs/BITACORA-CAMBIOS.md
rutas fuera de módulos/core/data/styles/docs
```

---

## 5. Uso con gate

Secuencia recomendada:

```powershell
node tools/orbit360-auditar-candidata-claude-gate-v1146.mjs --candidate "C:\ruta\a\candidata-extraida"
node tools/orbit360-plan-empalme-selectivo-claude.mjs --candidate "C:\ruta\a\candidata-extraida"
```

Primero se decide si la candidata pasa el gate. Luego se genera plan de empalme selectivo.

---

## 6. Estado

Guía creada. Usar solo después de auditoría forense de candidata real.