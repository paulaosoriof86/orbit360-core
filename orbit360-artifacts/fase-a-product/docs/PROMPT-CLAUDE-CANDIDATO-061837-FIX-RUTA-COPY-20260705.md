# Prompt urgente para Claude — Fix candidato 061837

Claude, trabajar sobre esta candidata:

```txt
Prototype Development Request - 2026-07-05T061837.674.zip
```

Auditoría ChatGPT/Codex: la UI/Bandeja de conciliaciones está bien encaminada, pero antes de cerrar la candidata quedan 3 correcciones rápidas.

---

## Reglas obligatorias

No tocar backend protegido:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-* backend
```

No implementar Firestore real, auditLog real, persistencia real ni aplicación real de pagos. Eso queda para ChatGPT/Codex.

Mantener:

- sin datos reales;
- sin localStorage operativo nuevo;
- sin textos técnicos al cliente;
- sin aplicar pagos desde importador ni desde bandeja;
- Academia `CONTENT_V=5`;
- `modules/conciliaciones.js` solo lee/escribe propuestas en `Orbit.store('conciliaciones')`.

---

## Correcciones obligatorias

### 1) Activar ruta `conciliaciones` en tenant

En `core/config.js`, agregar `conciliaciones` a:

```txt
Orbit.tenant.DEFAULT.modulosActivos
```

Debe quedar después de `cobros`:

```txt
... 'polizas', 'cobros', 'conciliaciones', 'renovaciones' ...
```

Razón: el router filtra por `Orbit.tenant.isActive(route)`. Aunque la ruta esté en NAV, si no está en `modulosActivos` puede no verse.

### 2) Agregar `conciliaciones` al rol Admin

En `Orbit.ROLES.Admin.modulos`, agregar `conciliaciones` después de `cobros`:

```txt
... 'polizas', 'cobros', 'conciliaciones', 'renovaciones' ...
```

Requisito original: visible para Dirección/Admin/Finanzas. Ya está en Dirección y Finanzas; falta Admin.

### 3) Limpiar copy visible residual del importador

En `core/importa.js`, dentro del preview de conciliación, aún aparece:

```txt
En el paso siguiente podés aplicar pagos por póliza.
```

Cambiar por algo como:

```txt
En el paso siguiente podrás revisar propuestas de conciliación por póliza. No aplica pagos por sí sola.
```

También cambiar:

```txt
Pagos del archivo aún no aplicados a su póliza. Se aplicarán sin duplicar.
```

por:

```txt
Pagos del archivo aún no aplicados a su póliza. Se propondrán para validación sin duplicar.
```

Y cambiar:

```txt
Sin pagos pendientes de aplicar.
```

por:

```txt
Sin pagos pendientes de validación.
```

---

## Verificaciones antes de entregar

Entregar resumen con:

```txt
0 errores JS
index carga modules/conciliaciones.js
ruta Conciliaciones visible por tenant y roles Dirección/Admin/Finanzas
acciones de Conciliaciones solo hacen Orbit.store.update('conciliaciones', …)
no hay mutación de cobros desde modules/conciliaciones.js
preparar_aplicacion_controlada solo informa, no aplica pago
copy residual corregido en core/importa.js
backend protegido intacto
```

No declarar cerrado:

```txt
persistencia real de conciliaciones/auditLog
conexión al score real de dryRunReport
aplicación controlada real de pagos/comisiones
smoke visual real con backend LAB
```

Entrega un nuevo ZIP candidato y resumen breve de archivos cambiados.