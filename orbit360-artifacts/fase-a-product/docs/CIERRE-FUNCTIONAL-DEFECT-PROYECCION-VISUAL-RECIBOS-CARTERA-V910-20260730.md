# CIERRE FUNCTIONAL_DEFECT — PROYECCIÓN VISUAL RECIBOS/CARTERA 9.1.0

Fecha operativa: 2026-07-30 / Guatemala  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Hallazgo posterior a WRITE_PASS

La escritura 9.1.0 cerró correctamente con 1293 `recibosEsperados`, 673 `carteraPrimas`, 0 `cobros` y 0 `finmovs`. Al preparar la revisión visual obligatoria se detectó que la UI canónica todavía calculaba cartera y recibos desde `cobros`, colección que por contrato debe continuar en cero hasta el bloque posterior de Cobros/conciliación.

Además, el store LAB base no suscribía `recibosEsperados` ni `carteraPrimas`, por lo que el navegador no podía proyectar los datos recién materializados aunque Firestore estuviera correcto.

## Clasificación

`FUNCTIONAL_DEFECT` de proyección visual/read-model.

No fue defecto de migración, writer, Firestore, relaciones ni conteos.

## Causa raíz

La UI conservaba el modelo legado donde los recibos de calendario y los cobros aplicados compartían la colección `cobros`. El contrato 9.1.0 ya los separa:

- `recibosEsperados` = calendario/estado operativo del recibo;
- `carteraPrimas` = obligaciones pendientes/exigibles;
- `cobros` = pagos aplicados/conciliados, todavía 0 en este bloque.

La proyección visual no había sido actualizada junto con ese cambio de contrato.

## Corrección

Se implementó una capa aditiva read-only para LAB, sin reescribir el adaptador protegido:

- `core/backend-lab-receipts-portfolio-projection-v910.js` hidrata únicamente `recibosEsperados` y `carteraPrimas` desde la ruta canónica del tenant y las expone por la API existente `Orbit.store`;
- `core/backend-lab-canonical-view-sync.js` monta la proyección y re-renderiza Cliente 360/Pólizas cuando cambian clientes, pólizas, vehículos, recibos, cartera o cobros;
- Cliente 360 separa cartera por vencer, cartera exigible e histórica exigible;
- `pago_reportado` se muestra como pago reportado pendiente de conciliación, no como cobro aplicado;
- el tab Cobros permanece separado y honestamente vacío mientras `cobros=0`;
- Pólizas muestra `Recibos esperados` y distingue `Genera calendario`, `Histórico · saldo exigible` e `Histórico · sin saldo exigible`;
- no se habilitan acciones de confirmar/aplicar cobro desde esta proyección.

## Seguridad y alcance

La proyección usa snapshots read-only. No contiene llamadas Firestore `set`, `update`, `delete`, `add`, `batch` o `commit`. No modifica `data/store-firestore-lab.local.js` ni backend productivo.

## Evidencia estática

- run: `30603906600` · SUCCESS
- job: `91072162904`
- artifact: `8782892029`
- artifact digest: `sha256:e7d11770eeaf24c33c0fdd80a8f77810fc4855db73d8f5f4c3a41d83e77dedc0`
- gate canónico 9.1.0: PASS
- sintaxis: PASS
- contrato visual estático: PASS
- Firestore read/write: `0 / 0`
- browser: `0`
- deploy: `0`
- producción: `0`

## Estado

`VISUAL_PROJECTION_STATIC_READY`.

La corrección todavía no está en el Hosting LAB publicado. La siguiente frontera es una única autorización de Hosting LAB para publicar este HEAD y ejecutar la revisión visual obligatoria. Cobros/conciliación permanece bloqueado hasta cerrar esa revisión.

## Reuso / Academia / Claude

El patrón es reusable: separar calendario de recibos, cartera exigible y cobro aplicado también en el read-model/UI. La proyección genérica puede replicarse sin datos reales. El bridge LAB y rutas reales permanecen backend protegido.
