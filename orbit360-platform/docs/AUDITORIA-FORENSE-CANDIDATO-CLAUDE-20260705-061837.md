# Auditoría forense — Candidata Claude 2026-07-05T061837.674

**Fecha:** 2026-07-05  
**Archivo auditado:** `Prototype Development Request - 2026-07-05T061837.674.zip`  
**Base comparada:** `Prototype Development Request - 2026-07-04T211525.464.zip`  
**Repo/rama backend:** `paulaosoriof86/orbit360-core` / `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy.

---

## 1. Veredicto ejecutivo

La candidata **sí avanzó** y queda cerca de aceptarse como nueva base frontend, pero **requiere mini-fix urgente antes de empalme**.

Resolvió de forma sustancial:

- nuevo módulo `modules/conciliaciones.js`;
- ruta `conciliaciones` en NAV;
- columnas y estados del contrato readiness;
- acciones por estado;
- estado vacío honesto;
- acciones que solo actualizan propuestas vía `Orbit.store.update('conciliaciones', …)`;
- `preparar_aplicacion_controlada` como modal informativo, sin aplicar pagos;
- copy principal de estados de cuenta y planilla;
- docs de candidato 211525.464 y Academia `CONTENT_V=5`;
- backend protegido intacto.

No debe cerrarse todavía porque hay 3 hallazgos P0/P1:

1. `conciliaciones` no está en `Orbit.tenant.DEFAULT.modulosActivos`, por lo que la ruta puede quedar oculta por tenant.
2. `Admin` no incluye `conciliaciones`, aunque el requisito era Dirección/Admin/Finanzas.
3. `core/importa.js` conserva copy visible que todavía sugiere aplicar pagos por póliza.

---

## 2. Inventario comparativo

```txt
Base 211525.464: 97 archivos
Nueva 061837.674: 98 archivos
Agregados: 1
Eliminados: 0
Modificados: 7
JS totales: 55
Módulos: 31
Scripts index.html: 52
Scripts faltantes: 0
Errores JS: 0
```

Archivo agregado:

```txt
modules/conciliaciones.js
```

Archivos modificados:

```txt
CHANGELOG.md
core/config.js
core/importa.js
docs/BITACORA-CAMBIOS.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
index.html
```

---

## 3. Backend protegido

Revisión contra base `211525.464`:

```txt
data/store.js: presente y sin cambios
store-firestore-lab.local.js: no viene en ZIP
backend-lab-loader.js: no viene en ZIP
backend-lab-init.js: no viene en ZIP
backend-lab-security-guard.js: no viene en ZIP
firestore.rules: no viene en ZIP
```

Conclusión: Claude no pisó backend protegido. En empalme se debe seguir excluyendo `data/store.js` y todo backend protegido.

---

## 4. UI/Bandeja `conciliaciones`

Implementación revisada:

- `Orbit.modules.conciliaciones` existe;
- lee `Orbit.store.all('conciliaciones')`;
- usa `Orbit.store.get('conciliaciones', id)` para detalle;
- las transiciones usan `Orbit.store.update('conciliaciones', id, patch)`;
- no se detectó mutación a `cobros` desde `modules/conciliaciones.js`;
- no se detectó `postRecaudo` en el módulo;
- no usa `localStorage` operativo nuevo;
- estados alineados con contrato:
  - `PROPUESTA`, `EN_REVISION`, `VALIDADA`, `RECHAZADA`, `BLOQUEADA`, `ANULADA`, `APLICADA`;
- matriz de acciones coincide con readiness;
- estado vacío honesto incluido.

---

## 5. Hallazgo P0 — ruta puede quedar oculta

`core/config.js` agrega la ruta al NAV, pero `Orbit.tenant.DEFAULT.modulosActivos` no contiene `conciliaciones`.

El router filtra por:

```txt
Orbit.tenant.isActive(route) && Orbit.session.canSee(route)
```

Por tanto, la ruta puede no verse aunque esté en NAV.

**Corrección requerida:** agregar `conciliaciones` en `modulosActivos`, después de `cobros`.

---

## 6. Hallazgo P0 — rol Admin incompleto

Requisito recibido: visible para Dirección/Admin/Finanzas.

Estado auditado:

```txt
Dirección: sí tiene conciliaciones
Finanzas: sí tiene conciliaciones
Admin: no tiene conciliaciones
```

**Corrección requerida:** agregar `conciliaciones` en `Orbit.ROLES.Admin.modulos`, después de `cobros`.

---

## 7. Hallazgo P1 — copy visible residual en importador

En `core/importa.js` queda un texto visible que contradice la regla validar ≠ aplicar:

```txt
En el paso siguiente podés aplicar pagos por póliza.
```

También aparece una frase equivalente en el bloque de pagos no aplicados:

```txt
Se aplicarán sin duplicar.
```

**Corrección requerida:** cambiar a lenguaje de propuesta/validación, por ejemplo:

```txt
En el paso siguiente podrás revisar propuestas de conciliación por póliza. No aplica pagos por sí sola.
```

```txt
Pagos del archivo aún no aplicados a su póliza. Se propondrán para validación sin duplicar.
```

Y donde diga `Sin pagos pendientes de aplicar`, cambiar por `Sin pagos pendientes de validación`.

---

## 8. Pendientes backend honestos

No cerrar todavía:

- persistencia real de `conciliaciones/auditLog`;
- conexión de la bandeja al score real de `dryRunReport`;
- aplicación controlada real de cobros/comisiones;
- smoke visual real con backend LAB;
- Portal reflector `validado ≠ pagado` si no está conectado a bandeja real.

---

## 9. Recomendación

Pedir a Claude una mini-corrección urgente antes de perder capacidad:

1. activar `conciliaciones` en tenant `modulosActivos`;
2. agregar `conciliaciones` al rol Admin;
3. corregir copy visible residual de importador;
4. confirmar 0 errores JS y backend protegido intacto.

Después de esa mini-corrección, la candidata puede ser auditada nuevamente y probablemente aceptada como base frontend para empalme seguro.