# Avance de empalme v1.88 · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Prototipo vigente:** `Prototype Development Request - 2026-07-03T000030.492.zip`  
**Versión:** v1.88 / scripts v1287 / seed `__v=35`

---

## 1. Decisión metodológica aplicada

Se adopta el flujo de **releases continuos**:

- Cada ZIP nuevo de Claude se trata como release candidate incremental.
- No se crea rama nueva por cada ZIP.
- Se trabaja en la rama backend LAB estable salvo riesgo alto.
- Se audita delta, se empalma selectivamente y se documentan mejoras/pendientes.
- Backend LAB no se reinicia ni se borra.

Documento fuente: `docs/METODOLOGIA-RELEASES-CONTINUOS.md`.

---

## 2. Avance ya aplicado en GitHub

### Documentación creada/actualizada

- `docs/METODOLOGIA-RELEASES-CONTINUOS.md`
- `docs/ORBIT360_ESTADO_TRABAJO_ACTUALIZACION_V188_20260703.md`
- `docs/CHANGELOG-V188-CONTINUIDAD.md`
- `docs/PENDIENTES-CLAUDE-POST-V188-20260703.md`

### `index.html`

Empalmado a v1287 preservando Backend LAB:

- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `data/store-firestore-lab.local.js`

Además, la preferencia del sidebar queda vía `Orbit.store.pref/setPref`, no `localStorage` directo.

---

## 3. Verificación local del ZIP v1.88

Se extrajo localmente el ZIP v1.88 y se verificó sintaxis JavaScript con Node:

```text
node --check core/config.js
node --check data/seed.js
node --check modules/configuracion.js
node --check modules/finanzas.js
```

Resultado: los cuatro archivos pasan sintaxis.

---

## 4. Ajuste preparado antes de subir lote grande

En `modules/configuracion.js` del ZIP v1.88 se detectó `localStorage` directo para logo:

- `localStorage.setItem('orbit360_logo', ...)`
- `localStorage.removeItem('orbit360_logo')`

Se preparó reemplazo local hacia:

- `Orbit.store.setPref('orbit360_logo', ...)`
- `Orbit.tenant.setDeep('branding', ...)`

Esto respeta la regla de capa única y mantiene compatibilidad con branding white-label.

---

## 5. Lote de empalme pendiente

Archivos pendientes de subir/empalmar desde ZIP v1.88:

- `core/config.js`
- `data/seed.js`
- `modules/configuracion.js` con ajuste sin `localStorage` directo
- `modules/finanzas.js`
- `docs/BITACORA-CAMBIOS.md`
- `CHANGELOG.md` principal, si se decide incorporar entrada consolidada además del complemento ya creado

Reglas para ese lote:

1. No tocar `data/store.js` sin revisión explícita.
2. Preservar backend LAB.
3. Mantener regla financiera corregida.
4. Confirmar que no se introduzcan datos reales.
5. Smoke demo + LAB después del empalme.

---

## 6. Siguiente paso operativo

Aplicar el lote anterior de forma controlada y luego ejecutar smoke local:

- demo normal sin querystring,
- LAB con `?orbitBackend=firestore-lab&tenant=alianzas-soluciones`,
- validar `OrbitBackend.status()` y contrato `Orbit.store`,
- validar render de módulos clave.
