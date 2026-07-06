# Bitácora — Plan empalme selectivo Claude

**Fecha:** 2026-07-06  
**Bloque:** planificador de empalme selectivo para candidatas Claude  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy.

---

## Necesidad

Las candidatas Claude pueden traer correcciones útiles junto con archivos que no deben empalmarse completos, especialmente `index.html`, backend protegido, `data/seed.js`, `core/importa.js` y `core/config.js`.

---

## Cambio aplicado

Se agregaron:

```txt
tools/orbit360-plan-empalme-selectivo-claude.mjs
orbit360-platform/docs/GUIA-PLAN-EMPALME-SELECTIVO-CLAUDE-20260706.md
```

---

## Impacto

Al recibir v1.146 o candidata posterior, se podrá generar un plan que clasifica cambios como bloqueados, revisión manual o candidatos a empalme selectivo.

---

## Estado

Plan-only. No copia archivos, no modifica app, no deploy y no merge.