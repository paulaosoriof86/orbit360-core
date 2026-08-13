# Orbit 360 — Matriz de propietarios, bridges y retiro

**Fecha:** 2026-07-17  
**Bloque:** 0 — baseline canónico, arquitectura activa y control de deltas  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Alcance inmediato:** slice Cliente 360 + Aseguradoras + sesión/multirol + navegación + legal + PWA.

## Regla arquitectónica

Cada comportamiento activo debe tener un solo propietario final. Un bridge temporal puede sobrevivir únicamente si:

1. tiene una responsabilidad concreta;
2. no sustituye backend protegido;
3. no reescribe otro owner;
4. tiene criterio y bloque de retiro;
5. está incluido en los validadores del bloque.

PWA no es bootstrap operativo. Los importadores no se cargan al iniciar. La configuración de un tenant vive en un archivo declarativo separado y no en el core reusable.

## Matriz vigente

| Archivo / contrato | Responsabilidad real | Clasificación | Estado 2026-07-17 | Acción | Criterio de retiro o cierre |
|---|---|---|---|---|---|
| `core/pwa.js` | Manifest, íconos, instalación, service worker y branding | **PROPIETARIO FINAL** | Integrado | Conservar | Debe fallar el gate si carga sesión, legal, router, importadores o módulos |
| `core/router.js` | Rutas, sidebar, menú móvil, gate de módulo, búsqueda y bootstrap secuencial del slice | **PROPIETARIO FINAL + BOOTSTRAP DEL SLICE** | Integrado | Conservar | Puede delegar contratos, pero no duplicar su lógica |
| `core/legal.js` | Catálogo, aceptación persistente e idempotencia por scope | **PROPIETARIO FINAL** | Integrado | Conservar | Un modal máximo por scope; callbacks una sola vez |
| `core/access-scope.js` | Identidad, multirol, scope, país, permisos, gates, altas, auditoría y store con alcance | **PROPIETARIO FINAL** | Integrado | Conservar | Ningún bridge puede reemplazar su motor |
| `core/session-multirol-visibility-v20260716.js` | Selector de roles y visibilidad efectiva | **TEMPORAL_RETIRO** | Cargado por bootstrap | Conservar hasta gate; después integrar en sesión/config | Retirar cuando selector, roles asignados y módulos efectivos estén cubiertos por owner y gate |
| `core/client-canonical-view-projection-v20260716.js` | API pura de proyección + puente temporal de proyección en memoria | **TEMPORAL_RETIRO PARCIAL** | Cargado por bootstrap | Conservar API; retirar `applyAll()` progresivamente | Retirar mutación en memoria cuando Cliente 360, Calidad, búsqueda, Pólizas y Cobros usen `Orbit.clientProjection` |
| `modules/aseguradoras.js` | Directorio y ficha operativa | **PROPIETARIO FINAL DE RUTA** | Activo | Integrar conocimiento/orden/gates | Debe quedar como único renderer de `#/aseguradoras` |
| `modules/aseguradoras-frontend-projection-v20260716.js` | Orden tenant y conocimiento proyectado | **TEMPORAL_RETIRO** | Cargado por bootstrap | Integrar selectivamente en `modules/aseguradoras.js` | Retirar tras equivalencia funcional y gate visual |
| `modules/aseguradoras-candidate-actions.js` | Cargas duplicadas, alineación de sesión y botones aditivos | **RETIRADO DEL ARRANQUE** | No cargado | No reactivar | Eliminar cuando se confirme que no contiene una acción única necesaria |
| `core/empalme-v1251-runtime.js` | Sesión, scope, guards y normalización ficticia transversal | **RETIRADO DEL ARRANQUE** | No cargado | No reactivar | Eliminar tras validadores/gate; sus contratos ya tienen owners |
| `data/import-initial-profiles.js` | Perfiles de importación inicial | **SOLO BAJO DEMANDA** | No cargado al iniciar | Invocar desde Importar | Nunca volver al bootstrap general |
| `modules/importar-initial-tenant-lab.js` | Flujo inicial LAB | **SOLO BAJO DEMANDA / LAB** | No cargado al iniciar | Invocar desde Importar con confirmación | Nunca volver al bootstrap general |
| `core/tenant-insurer-config-p10.js` | Registro reusable de configuración de aseguradoras por tenant | **PROPIETARIO REUSABLE DE CONFIGURACIÓN** | Cargado por bootstrap | Conservar | No incluir tasas/aseguradoras concretas en core |
| `data/tenant-runtime-config-index.js` | Índice tenant → archivo de configuración | **REGISTRO DECLARATIVO FINAL** | Creado | Conservar | Sin lógica operativa ni datos sensibles |
| `data/tenant-alianzas-soluciones-insurers-p10.js` | Configuración de A&S separada | **TENANT_AYS_ONLY** | Carga condicionada al tenant activo | Conservar | No mover al core; no agregar clientes, cuentas, credenciales o secretos |
| Bridges de Pólizas, Renovaciones, Emisión, Portal, Cotizador y Comparativo | Funciones de módulos posteriores | **DIFERIDOS POR MÓDULO** | Aún presentes en `index.html` | No ampliar en este bloque | Se retiran al cerrar su módulo correspondiente; no bloquean el gate del slice si no interfieren con él |

## Cambios arquitectónicos ya aplicados

### PWA

Se retiraron de `core/pwa.js`:

- `empalme-v1251-runtime.js`;
- importadores iniciales;
- parche legal;
- parche del menú móvil;
- sesión multirol;
- proyección de clientes;
- proyección y acciones de Aseguradoras.

### Router

`core/router.js` quedó como owner de:

- navegación por ruta;
- cierre y apertura móvil;
- overlay y `aria-expanded`;
- gate de módulo;
- refresco reactivo;
- búsqueda con proyección canónica;
- carga secuencial del slice.

### Legal

`core/legal.js` quedó como owner idempotente:

- un modal máximo por scope;
- callbacks en cola;
- resolución única tras aceptación;
- persistencia por versión.

### Configuración tenant

La selección de configuración se resuelve mediante:

```txt
data/tenant-runtime-config-index.js
→ tenant activo
→ archivo de configuración separado
```

El core no contiene la decisión `alianzas-soluciones` dentro de un parche operativo.

## Puerta de salida arquitectónica del Bloque 0

Antes de ejecutar el gate LAB deben cumplirse todos:

- [x] PWA sin lógica operativa.
- [x] Router propietario del menú móvil y rutas.
- [x] Legal idempotente en su owner.
- [x] Acceso/scope con un solo motor.
- [x] Importadores iniciales fuera del arranque.
- [x] Configuración tenant declarativa.
- [x] `empalme-v1251-runtime.js` fuera del arranque.
- [x] `aseguradoras-candidate-actions.js` fuera del arranque.
- [ ] Proyección de Aseguradoras integrada en su owner.
- [ ] Matriz de estados default-deny validada en owner.
- [ ] Puente de Aseguradoras retirado del bootstrap.
- [ ] Sintaxis/referencias/arquitectura en verde.
- [ ] Manifiesto final del baseline del slice actualizado.

## Carriles

### Carril A — frontend, UX y Academia

Arquitectura del slice, propietarios, retiro de bridges, Cliente 360 y Aseguradoras.

### Carril B — backend y seguridad

`Orbit.store`, Auth, reglas, loaders backend y validadores protegidos permanecen intactos. La arquitectura productiva read-only pertenece al Bloque 2.

### Carril C — datos reales

No se reimporta. El gate utilizará únicamente los datos LAB ya confirmados. Pólizas, vehículos, cartera y cobros permanecen fuera de la carga controlada.

## Siguiente acción exacta

```txt
Integrar la proyección reusable de Aseguradoras en modules/aseguradoras.js
→ validar estados separados y default-deny
→ retirar modules/aseguradoras-frontend-projection-v20260716.js del bootstrap
→ ejecutar validador de arquitectura
→ preparar gate LAB del Bloque 1
```
