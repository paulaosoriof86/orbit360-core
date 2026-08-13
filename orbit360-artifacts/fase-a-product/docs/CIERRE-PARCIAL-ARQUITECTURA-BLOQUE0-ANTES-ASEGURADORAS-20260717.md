# Orbit 360 — Cierre parcial de arquitectura del Bloque 0

**Fecha:** 2026-07-17  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Estado:** `NO_GO_CONTROLADO` — un pendiente arquitectónico identificado.

## Objetivo del subbloque

Cerrar propietarios y bootstrap del slice Cliente 360 + Aseguradoras antes del gate LAB, sin continuar Cobros ni ampliar módulos operativos.

## Implementación completada

### 1. PWA como propietario exclusivo

`core/pwa.js` conserva únicamente:

- manifest dinámico;
- íconos;
- instalación;
- service worker;
- branding white-label.

Se retiraron cargas de sesión, importadores, Legal, Router, Cliente 360 y Aseguradoras.

Commit:

```txt
c16e1cad3e57abe904644e61365377c082194058
```

### 2. Router como propietario de navegación y bootstrap del slice

`core/router.js` controla:

- rutas y sidebar;
- gate de módulo;
- menú móvil y overlay;
- `aria-expanded`;
- cierre después de navegar;
- refresco reactivo;
- búsqueda con proyección canónica;
- secuencia única de contratos del slice.

Commits:

```txt
3c72a343118e114bd39af14fdbf7cb80e5ad5d03
c814c9e5f0cadec56adb32d377f37d2cd8d73fe4
```

### 3. Legal como propietario idempotente

`core/legal.js` controla:

- un modal máximo por scope;
- cola de callbacks;
- resolución única;
- persistencia por versión.

Commit:

```txt
5aa2c36d4e430b5bf62247c6aee9e3208a80af12
```

### 4. Configuración tenant declarativa

Se creó:

```txt
data/tenant-runtime-config-index.js
```

El índice selecciona el archivo de configuración del tenant activo. No contiene datos de clientes, credenciales, cuentas ni secretos.

Commit:

```txt
b1aa4ec765780f82f8a79a615dd4955f380df226
```

### 5. Matriz de propietarios y retiro

Se creó:

```txt
docs/MATRIZ-PROPIETARIOS-BRIDGES-RETIRO-BLOQUE0-20260717.md
```

Commit:

```txt
77c1dde489e2a4878500dc1866fbc0eeb741f2bd
```

### 6. Gate estático de arquitectura

Se creó:

```txt
tools/orbit360-block0-architecture-gate-v20260717.js
```

Comprueba:

- PWA sin runtime operativo;
- Legal idempotente en owner;
- Router sin loaders retirados;
- Access con superficie completa;
- configuración tenant sin secretos;
- owners cargados una sola vez;
- estados de Aseguradoras;
- habilitación independiente Cotizador/Comparativo;
- retiro de la proyección temporal antes del GO.

Commits:

```txt
43ea1780d57a528ffdd485aaeaaed2f44777a18b
e1beef922517acd26f8c829db89e27d2a11f3252
```

El archivo fue comprobado con `node --check` sin errores.

## Bridges retirados del arranque

```txt
core/empalme-v1251-runtime.js
modules/aseguradoras-candidate-actions.js
data/import-initial-profiles.js
modules/importar-initial-tenant-lab.js
```

Los archivos no fueron borrados todavía; dejaron de formar parte del runtime. Se conservarán hasta verificar el gate y después podrán eliminarse con evidencia.

## Contratos temporales todavía cargados

```txt
core/session-multirol-visibility-v20260716.js
core/client-canonical-view-projection-v20260716.js
modules/aseguradoras-frontend-projection-v20260716.js
```

Los dos primeros pueden atravesar el gate como contratos temporales documentados:

- sesión multirol: preserva identidad y módulos efectivos;
- proyección de clientes: conserva la API pura y un puente en memoria mientras se migran consumidores.

La proyección de Aseguradoras no debe atravesar el cierre arquitectónico porque todavía actúa sobre el DOM del owner.

## Único NO_GO actual

```txt
Integrar orden, conocimiento proyectado y estados default-deny
sobre modules/aseguradoras.js
→ retirar modules/aseguradoras-frontend-projection-v20260716.js
   del bootstrap de core/router.js
```

No se declara GO mientras el validador detecte esa referencia.

## Carriles

### Carril A

Arquitectura frontend, owners, bridges, Aseguradoras y Academia.

### Carril B

Backend protegido intacto. No se modificaron store, Auth, reglas, Firestore ni pipelines.

### Carril C

No se reimportaron datos. El siguiente uso de datos será el gate LAB con los conteos ya confirmados.

## Academia

Debe actualizarse para explicar:

- PWA no es bootstrap operativo;
- owner frente a bridge;
- configuración tenant separada del core;
- importadores bajo demanda;
- gates default-deny por consumidor;
- retiro de bridges mediante evidencia.

## Siguiente acción exacta

```txt
modules/aseguradoras.js como owner completo
→ retirar proyección temporal del bootstrap
→ ejecutar gate estático
→ actualizar manifiesto baseline
→ iniciar Bloque 1: gate LAB Cliente 360 + Aseguradoras
```
