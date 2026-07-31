# CIERRE TÉCNICO — HOSTING LAB FIX PROYECCIÓN RECIBOS/CARTERA 9.1.0

Fecha operativa: 2026-07-30 Guatemala  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Autorización consumida

`AUTORIZO HOSTING LAB FIX PROYECCION RECIBOS CARTERA V910 20260730`

Alcance autorizado: un único deploy Hosting al canal LAB existente, paridad, diagnóstico de hidratación y revisión visual read-only. No autorizó Rules, Functions, Storage, escrituras de datos, producción, main, merge ni Cobros.

## Fuente y causa raíz previa

Fix funcional de proyección: `da9eaf6c862729f8f513ee1318acca1d00b56cd5`.

Causa raíz corregida:

`PROJECTION_WRAPSTORE_NON_IDEMPOTENT_BLOCKS_ATTACH_AFTER_BOOT_WRAP`

El bridge `core/backend-lab-receipts-portfolio-projection-v910.js` quedó idempotente: un store ya envuelto se considera listo y `attach()` continúa con los snapshots suplementarios.

Evidencia pre-Hosting: run `30630611243` · SUCCESS · artifact `8793162582` · digest `sha256:deca558e721d05d48ca74591605efa4214330659835a6a92faecabc93be1fc01`.

## Ejecución autorizada

Run `30631820866` · artifact `8793675831` · digest `sha256:ca22945825724826b725dd35201bddf5bcc8e2e4953625f33971fbcb2a8fd4ed`.

Resultado por etapa:

- autorización / lineage / bridge exacto: PASS;
- gate canónico: 32/32 PASS;
- prueba static + synthetic del lifecycle antes del deploy: PASS;
- deploy único Hosting LAB preview: PASS;
- paridad remota de activos críticos: 6/6 PASS;
- diagnóstico de hidratación real: PASS;
- revisión visual automatizada: FAIL únicamente en loop multirol, etapa `role_Dirección`.

No se ejecutó un segundo Hosting deploy.

## Estado real de hidratación tras publicar el fix

La evidencia sanitizada confirmó:

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 1293
carteraPrimas: 673
cobros: 0
finmovs: 0
```

La proyección 9.1.0 quedó:

```text
ready: true
attached: recibosEsperados + carteraPrimas
errors: {}
```

Por tanto quedan descartados como causa del pendiente visual: Rules, Hosting/paridad, datos, Auth, entrypoint LAB y lifecycle de la proyección.

## Semántica de Recibos/Cartera ya validada en el mismo browser

Antes del loop multirol pasaron:

- baseline completo;
- proyección ready;
- calendario activo;
- cartera histórica exigible;
- `pago_reportado` como pendiente de conciliación;
- Cobros separado y en cero;
- cero escrituras operativas.

## Pendiente visual

El único fallo automatizado fue:

`locator('#host table.tbl').first().waitFor({state:'visible'})` → timeout 15 s en `role_Dirección`.

La inspección estática confirma que:

- Dirección, Operativo y Asesor incluyen `cliente360` en sus módulos permitidos;
- Router despacha `Orbit.modules.cliente360.render(host)` cuando la ruta está permitida;
- Cliente 360 contiene la tabla `.tbl` en su vista lista;
- el selector multirol reconstruye navegación y dispara el hash vigente, sin redirigir a otro módulo.

Esto no permite afirmar todavía si el timeout proviene de una excepción de render sobre algún registro del listado completo o de una condición obsoleta/racy del validador.

Clasificación pendiente estricta entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`.

## STOP_RETRY aplicado

Se intentó capturar de forma read-only el estado exacto rol/ruta/renderer, sin deploy. Dos mecanismos de disparo de GitHub Actions no publicaron ejecución/status en el plazo operativo esperado. Esto se clasifica como `PIPELINE_MECHANISM_FAILURE` del diagnóstico, no como fallo del producto.

No se crean más workflows ni reintentos en la misma etapa hasta corregir/normalizar ese mecanismo.

## Estado de cierre

- Recibos/Cartera WRITE_PASS: preservado.
- Rules compatibility read-only: PASS y preservada.
- Hosting LAB con lifecycle fix: DEPLOY_PASS.
- Paridad: 6/6 PASS.
- Hidratación 1293/673: PASS.
- Revisión visual semántica previa a multirol: PASS.
- Revisión visual multirol completa: PENDIENTE.
- Revisión visual humana: NO habilitada todavía.
- Cobros/conciliación: BLOQUEADO hasta cierre visual.

## Siguiente acción exacta

No volver a desplegar Hosting. Corregir o reutilizar un mecanismo de diagnóstico read-only ya estable para capturar, en una única ejecución, el estado de `cliente360` inmediatamente después del cambio de rol: rol efectivo, permiso, hash/ruta, excepción de render y presencia/visibilidad de lista. Con esa evidencia clasificar `FUNCTIONAL_DEFECT` vs `VALIDATOR_STALE`; corregir únicamente el owner correspondiente y ejecutar una sola revisión visual read-only. Solo con evidencia automatizada `ok:true` se habilita la revisión humana y luego Cobros.
