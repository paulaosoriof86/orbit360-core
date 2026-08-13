# Plan de empalme seguro — candidato Claude 211525

**Fecha:** 2026-07-04  
**Candidato:** `Prototype Development Request - 2026-07-04T211525.464.zip`  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** empalme preparado por pipeline seguro; no reemplazo bruto.

---

## 1. Por qué no se debe empalmar el ZIP completo a ciegas

El candidato Claude trae un `orbit360-platform/` válido, pero también incluye `data/store.js` del prototipo. La rama backend activa protege:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
```

Además, el `index.html` del candidato Claude no trae la inyección LAB completa de la rama backend:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
core/auth.js?v1295-labfix-20260703
```

Por eso, el empalme debe ser aditivo/controlado.

---

## 2. Qué se debe aceptar del candidato

El candidato `211525.464` corrige/contiene avances que deben conservarse:

- `core/importa.js`: conciliación ya no aplica pagos directo.
- `core/importa.js`: planilla sin fallback `cur || 'GTQ'`.
- `modules/cobros.js`: `validarReporte()` ya no aplica pago.
- `modules/cliente360.js`: `Validada (por aplicar)` y acción separada.
- `data/academia-plus.js`: `CONTENT_V=5` y lección de conciliación heredada de `205210.456`.
- `modules/polizas.js`: `gastosFinan` heredado de `205210.456`.
- cache busts de `index.html`, preservando backend LAB.

---

## 3. Qué queda pendiente para Claude

Claude perdió capacidad antes de atender el último prompt. Pendientes vivos:

1. Documentación global realmente alineada:
   - `README.md`
   - `CHANGELOG.md`
   - `docs/PENDIENTES-Y-MEJORAS.md`
   - `docs/REPORTE-SMOKE.md`
   - `docs/BITACORA-CAMBIOS.md`
2. Copy residual:
   - cambiar “permite aplicar pagos por póliza” por “propone pagos para validación por póliza”.
   - cambiar “Pendiente de aplicar” por “Propuesta pendiente” o “Pendiente de validación”.
3. Documentar limitación:
   - `conciliacionPropuesta` es visual/prototipo;
   - persistencia real en `conciliaciones` queda para backend ChatGPT/Codex.
4. Academia por ramo/producto:
   - Vida, Gastos médicos, Hogar, Fianzas, RC, Transporte/Carga.

---

## 4. Pipeline agregado

Se agregó:

```txt
tools/orbit360-empalmar-candidato-claude-211525-ays.ps1
```

Uso:

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-empalmar-candidato-claude-211525-ays.ps1 -ZipPath "C:\ruta\Prototype Development Request - 2026-07-04T211525.464.zip"
```

Modo simulación:

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-empalmar-candidato-claude-211525-ays.ps1 -ZipPath "C:\ruta\Prototype Development Request - 2026-07-04T211525.464.zip" -DryRun
```

---

## 5. Validaciones del pipeline

El pipeline:

- verifica raíz `orbit360-platform/`;
- excluye backend protegido;
- copia frontend/docs no protegidos;
- preserva loader/init/store LAB en `index.html`;
- preserva `core/auth.js?v1295-labfix-20260703`;
- ejecuta `node --check` sobre JS si Node está disponible;
- genera reportes en `_orbit360_reports/`;
- no hace commit;
- no hace merge;
- no hace deploy.

---

## 6. Estado para backend

Para continuar backend, la base lógica auditada es:

```txt
Prototype Development Request - 2026-07-04T211525.464.zip
```

Pero cualquier trabajo de repo debe preservar la rama:

```txt
ays/backend-tenant-lab-v99-20260703
```

y los archivos backend protegidos.

---

## 7. Próximo bloque backend recomendado

Continuar con:

```txt
plan validado -> ejecutor LAB deshabilitado -> guardar propuestas en conciliaciones -> auditLog -> sin tocar cobros
```

El ejecutor debe quedar deshabilitado por defecto y requerir aprobación explícita para cualquier escritura LAB.