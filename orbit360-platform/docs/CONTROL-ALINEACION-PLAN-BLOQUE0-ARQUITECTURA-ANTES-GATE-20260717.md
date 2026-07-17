# CONTROL DE ALINEACIÓN DEL PLAN — ARQUITECTURA ANTES DEL GATE

**Fecha:** 2026-07-17  
**Proyecto:** Orbit 360 A&S  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Bloque activo:** Bloque 0 — baseline canónico sano y control de deltas

## Decisión correctiva

Antes de continuar módulos operativos fuera del slice inicial, se debe cerrar la arquitectura activa exigida por el Plan Maestro.

El trabajo aplicado en `core/access-scope.js` y `core/client-canonical-view-projection-v20260716.js` se conserva porque corresponde a consolidación de contratos/propietarios. El ajuste en `modules/polizas.js` se conserva como delta seguro, pero queda estacionado y no habilita continuar Pólizas/Cobros en este momento.

`modules/cobros.js` no se modifica hasta cerrar Bloque 0 y ejecutar el gate del Bloque 1.

## Pendientes obligatorios del Bloque 0

1. Declarar una sola baseline frontend compuesta mediante manifiesto y hashes.
2. Inventariar scripts realmente activos del slice:
   - bootstrap;
   - Cliente 360;
   - Aseguradoras;
   - sesión/multirol;
   - legal;
   - navegación;
   - PWA/cache.
3. Clasificar cada bridge:
   - integrar en propietario;
   - temporal con retiro;
   - retirar.
4. Mover la idempotencia legal a `core/legal.js`.
5. Mover la navegación móvil a `core/router.js`.
6. Dejar `core/pwa.js` limitado a manifest, instalación, iconos, service worker y cache.
7. Sacar de PWA los loaders operativos de sesión, Cliente 360, Aseguradoras e importación.
8. Definir un solo bootstrap explícito del slice.
9. Asegurar un solo renderer propietario por Cliente 360 y Aseguradoras.
10. Retirar o justificar con fecha de salida los bridges del slice.
11. Reconciliar README, PR, manifiesto y ledger Claude.
12. Confirmar hashes del backend protegido.
13. Ejecutar sintaxis, referencias, contratos y copy.

## Orden obligatorio después

```txt
Bloque 0 arquitectura: PASS
→ Bloque 1 gate conjunto LAB
→ una revisión visual Paula
→ Bloque 2 bootstrap productivo read-only
→ Bloque 3 alta productiva tenant
→ Bloque 4 escritor durable/importadores
→ Bloque 5 release candidate
→ Bloque 6 go-live controlado
```

## Gate del Bloque 1

El primer gate operacional se limita a:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- Dirección escritorio;
- Operativo tableta;
- Asesor móvil;
- legal una vez;
- menú móvil;
- Cliente 360 lista/ficha/calidad;
- Aseguradoras directorio/ficha/conocimiento;
- multirol/scopes;
- copy honesto;
- relaciones no cargadas vacías.

No incluye todavía una expansión operativa de Pólizas o Cobros, porque sus fuentes no han sido cargadas en el slice controlado.

## Carriles

### A — frontend/UX/Academia

Cerrar propietarios, bridges, bootstrap, responsive y estados honestos.

### B — backend/seguridad/Orbit.store

Confirmar que Auth, stores, reglas, contratos y pipelines protegidos permanecen intactos. No construir aún el bootstrap productivo del Bloque 2.

### C — datos reales

No reimportar. Usar únicamente los conteos y registros LAB ya cargados para el gate. Pólizas es la siguiente fuente solo después del cierre visual del Bloque 1.

## Acumulado Claude

Los hotfixes reutilizables de v1.258 permanecen acumulados. No se solicita otra candidata general antes del gate visual. Los hallazgos de arquitectura que sean reutilizables se agregarán al ledger, sin detener el plan.

## Siguiente acción exacta

Crear el inventario de scripts activos y la matriz propietario/bridge/retiro del slice; después trasladar legal y navegación a sus propietarios y limpiar PWA/bootstrap.
