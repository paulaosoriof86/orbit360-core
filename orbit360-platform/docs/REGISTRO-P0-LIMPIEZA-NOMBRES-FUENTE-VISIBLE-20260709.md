# REGISTRO P0 — LIMPIEZA DE NOMBRES DE FUENTE VISIBLE

Fecha: 2026-07-09  
Carril: B/C  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: helper agregado; ejecucion local pendiente.

---

## 1. Motivo

Academia, UI cliente, manuales operativos generales y pantallas multi-tenant no deben mencionar por nombre sistemas anteriores de A&S ni herramientas particulares de migracion.

El lenguaje visible debe ser generico y reutilizable para cualquier tenant:

- fuente externa;
- sistema anterior;
- base importada;
- CRM externo;
- reporte de cobros;
- estado de cuenta de aseguradora;
- planilla de comisiones;
- factura;
- documento importado.

---

## 2. Accion realizada

Se agrego helper seguro:

```txt
tools/orbit360-p0-clean-visible-source-names-20260709.mjs
```

Funcion:

- busca menciones visibles de sistemas anteriores;
- reemplaza etiquetas visibles por terminos genericos;
- crea backup local;
- genera reporte JSON en `_orbit360_reports`;
- no toca backend protegido;
- no toca store;
- no toca reglas Firebase;
- no sube datos reales;
- no ejecuta deploy.

---

## 3. Archivos objetivo del helper

```txt
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/academia.js
orbit360-platform/docs/ACADEMIA.md
orbit360-platform/docs/MANUAL-OPERATIVO.md
```

Si alguno no existe en la rama local, el helper lo reporta como `not found` sin fallar por eso.

---

## 4. Reemplazos previstos

| Antes visible | Despues visible |
|---|---|
| `SIGA / CRM externo` | `CRM externo / fuente externa` |
| `SIGA / CRM` | `CRM externo / fuente externa` |
| `SIGA` | `sistema anterior` |

Nota: si una documentacion tecnica interna requiere trazabilidad real de migracion, debe permanecer en documentos tecnicos internos, no en UI/Academia/manuales generales.

---

## 5. Ejecucion local sugerida

Desde raiz del repo:

```bash
node tools/orbit360-p0-clean-visible-source-names-20260709.mjs
```

Luego revisar:

```txt
_orbit360_reports/p0-clean-visible-source-names-*.json
_backups/p0_clean_visible_source_names_*/
```

---

## 6. Criterio de cierre

Este P0 se considera cerrado cuando:

1. el helper corre sin patrones prohibidos visibles restantes;
2. `configuracion.js` ya no muestra nombres de sistemas anteriores;
3. Academia/manuales usan lenguaje generico;
4. no se modifican archivos protegidos;
5. el reporte queda archivado en `_orbit360_reports`;
6. si hay cambios, se revisan antes de commit final.

---

## 7. Siguiente accion

Despues de esta limpieza, continuar con P0 de importador de polizas:

- llave compuesta;
- estado fuente original vs estado operativo Orbit;
- renovada vigente;
- cancelada exacta por vigencia;
- divisa/pais por aseguradora;
- recibos esperados sin inflar cartera historica.
