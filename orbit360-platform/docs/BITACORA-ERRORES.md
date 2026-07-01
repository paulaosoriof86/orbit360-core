# Bitácora de errores · Orbit 360

> Errores detectados y su resolución. Cuando ChatGPT/Codex (backend LAB) o la usuaria detecten un fallo, **registrarlo aquí** con: fecha, síntoma, causa, fix, versión. Si el fix es de prototipo → lo aplica Claude; si es de backend → lo aplica Codex.

## Formato
```
### [ID] Título corto
- Fecha: AAAA-MM-DD
- Síntoma: qué ve el usuario
- Causa: raíz técnica
- Fix: qué se cambió (archivo · función)
- Versión: vN.NN · Estado: RESUELTO / ABIERTO / EN BACKEND
```

## Resueltos (prototipo)

### [E-01] Tabla de cobros no refresca tras aplicar pago
- Fecha: 2026-07-01
- Síntoma: al aplicar un pago, el recibo no cambiaba de estado en la lista hasta recargar.
- Causa: el flujo re-renderizaba `#mod-host` (contenedor inexistente); el mount real es `#host`.
- Fix: `cobros.js` · `aplicarPago()` → `render(document.getElementById('host'))`.
- Versión: v1.45 · Estado: RESUELTO

### [E-02] Logo del cliente no aparecía en el login
- Fecha: 2026-07-01
- Síntoma: subías logo en Configuración pero el login seguía mostrando el slot vacío.
- Causa: `applyBrand()` sólo se invocaba tras entrar (router.init), no en la pantalla de login.
- Fix: `auth.js` · llamar `Orbit.applyBrand()` también en `showLogin`.
- Versión: v1.43 · Estado: RESUELTO

### [E-03] Fecha "Junio 2026" quemada en Inicio
- Fecha: 2026-07-01
- Síntoma: la fecha/mes no cambiaba con los datos.
- Causa: string hardcodeado en inicio.js y ui.js.
- Fix: `ui.js` · `now()`/`monthLabel()` derivan del ancla demo (`Orbit.tenant.demoDate`); backend puede pasar a fecha real.
- Versión: v1.43 · Estado: RESUELTO

### [E-04] Presupuesto financiero leía arrays quemados
- Fecha: 2026-07-01
- Síntoma: no se podía editar el presupuesto; valores fijos.
- Causa: `presupuesto()` duplicado; la versión viva leía un array literal.
- Fix: `finanzas.js` · lee/escribe colección `presupuesto` del store + CRUD.
- Versión: v1.44 · Estado: RESUELTO

## Abiertos / en backend
_(ninguno registrado al cierre v1.49 — usar este espacio para hallazgos de la migración LAB)_
