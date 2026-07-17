# Auditoría candidata Claude v1.256 — P0 pendientes

Fecha: 2026-07-17  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Plan: Bloque 0 — baseline canónico y sincronización Claude

## Candidata auditada

```txt
Prototype Development Request - 2026-07-17T010337.170.zip
SHA-256: c5b0291d63cfd228fa26448dd1f012c1e6b8d1a8e24137b77033c34e4e285d2c
Base declarada: v1.255
Versión entregada: v1.256
```

## Puerta técnica

```txt
archivos totales: 111
idénticos frente a v1.255: 100
modificados: 9
agregados: 2
retirados: 0
JavaScript: 59
node --check: 0 errores
referencias locales index.html: 59
referencias faltantes: 0
```

`data/store.js`, `core/auth.js`, `core/importa.js`, `core/pwa.js`, `core/router.js` y `core/legal.js` permanecen byte-idénticos respecto de v1.255.

## Resultado

La candidata es incremental y conserva los avances de v1.255, pero **no está lista para empalme**. Quedan tres P0 concretos.

## P0-01 — contrato de acceso incompleto

La entrega declara `Orbit.access` como contrato canónico, pero la implementación principal continúa dentro de `Orbit.accessScope` y `Orbit.access` solo lo envuelve. Además, la nueva superficie no conserva funciones requeridas por el cierre CRM:

```txt
deriveClientState
duplicateCandidates
prepareManual
audit
correction
scopedStore
withScope
```

Todos los consumidores de la candidata continúan usando `Orbit.accessScope`; no existe consumidor real de `Orbit.access`.

Corrección: un solo motor, superficie completa en `Orbit.access`, alias temporal compatible y conservación de todos los gates fail-closed.

## P0-02 — proyección canónica aplicada solo al detalle

`core/client-projection.js` existe y se carga, pero solo se usa en `cliente360.detalle()`.

La lista, búsqueda y filtros continúan leyendo directamente:

```txt
c.nombre
c.email
c.identificacion
c.tipo
c.ciudad
```

Pólizas, Cobros, Calidad y búsqueda no consumen la proyección. Un cliente importado con aliases puede abrirse proyectado, pero no necesariamente aparecer o encontrarse correctamente.

Corrección: aplicar la copia proyectada antes de lista, búsqueda, filtros y consumidores visuales relacionados, sin escribir ni reimportar.

## P0-03 — gate de conocimiento contradictorio

La UI declara:

```txt
Mapeado ≠ Validado ≠ Habilitado
```

pero `modules/aseguradoras.js` permite que `Validado` contribuya a `sirveParaTarifas`, y `sirveParaReglas` acepta cualquier estado salvo `Requiere validación`. El estado de grupo puede quedar `Habilitado` antes de una habilitación explícita.

Corrección: `Documento recibido`, `Mapeado`, `Persistido`, `Requiere validación` y `Validado` no deben abrir consumo operativo. Solo `Habilitado para Cotizador` o `Habilitado para Comparativo` pueden abrir el consumidor correspondiente.

## P1 — evidencia responsive

Claude documentó honestamente que no capturó Operativo tableta y Asesor móvil en los viewports exactos. CL-015 continúa abierto hasta el gate LAB y la revisión visual.

## Decisión del plan

```txt
empalme selectivo: BLOQUEADO por P0-01/P0-02/P0-03
backend protegido: intacto
datos A&S: intactos
main/deploy/producción: sin cambios
bloque activo: Bloque 0
```

No se abre otro paquete general. Claude debe corregir únicamente estos tres P0 sobre v1.256 y entregar un ZIP completo incremental. Después se reauditan solo esos P0 y sus regresiones directas; si pasan, se realiza el empalme selectivo y se continúa al gate LAB del Bloque 1.
