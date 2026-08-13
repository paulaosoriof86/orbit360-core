# Store Firestore productivo read-only P0

Fecha: 2026-07-13  
Carril: B — backend y `Orbit.store`  
Estado: factory implementada y validada; no instalada ni conectada

## Objetivo

Disponer de una primera implementación productiva de solo lectura para ejecutar el futuro smoke real sin riesgo de escribir, sin usar demo/LAB y sin modificar los stores protegidos existentes.

## Archivo

```txt
data/store-firestore-product-readonly-p0.js
```

## Propiedades

- se crea mediante factory; nunca se auto-instala;
- requiere dependencias Firestore inyectadas;
- requiere tenant canónico y catálogo explícito de colecciones;
- requiere un `queryPlanner` por colección;
- exige la restricción `tenantId == tenant actual`;
- aplica filtros de asesor/equipo/país suministrados por la política;
- usa las rutas canónicas `tenants/{tenantId}/data/{collection}/items`;
- conserva la API de lectura de `Orbit.store`;
- emite cambios por colección;
- mantiene cache solo en memoria;
- no usa seed ni `localStorage`;
- no conoce Firebase config, credenciales ni datos reales.

## Escrituras

Las siguientes operaciones lanzan siempre `WRITE_BLOCKED_PRODUCT_READ_ONLY_P0`:

```txt
insert
update
remove
setPref
reseed
```

Esto también aplica aunque el usuario sea Dirección o SuperAdmin. El primer smoke productivo debe ser estrictamente read-only.

## Aislamiento

- Una consulta sin `tenantId == tenant actual` se bloquea antes de adjuntar snapshots.
- Scope `none` produce colección denegada y vacía.
- Registros cuyo `tenantId` no coincide o que no tienen ID no se exponen.
- No existe fallback a demo, LAB, seed o almacenamiento local.

## Activación futura

Para usarlo será necesario, en un bloque posterior y autorizado:

1. entorno productivo disponible;
2. Auth y membresía verificadas;
3. readiness productivo `ready`;
4. planner derivado de rol activo, módulos, scope y país;
5. catálogo mínimo de colecciones para smoke;
6. instalación explícita como `Orbit.store` solo durante la sesión productiva;
7. validación de lecturas y persistencia;
8. mantener escrituras bloqueadas.

## ¿Aplica a Claude/prototipo?

No como código o arquitectura interna. Sí como estado de UX ya documentado: durante read-only, la UI no debe ofrecer acciones de guardado ni comunicar que una operación fue registrada.
