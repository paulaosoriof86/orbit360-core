# CIERRE WRITE PÓLIZAS A&S — 2026-07-30

Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `WRITE_PASS`

## Resultado ejecutivo

La autorización macro `AUTORIZO ESCRITURA CONTROLADA POLIZAS AYS 20260730` fue consumida una sola vez mediante el request inmutable `.github/orbit360-requests/policies-write-20260730.json`.

- request commit: `0e07bef6f12ac975d8b4270ff0c84ec877983524`
- workflow run: `30586726130`
- artifact: `8776780379`
- artifact digest: `sha256:2a2536e34d4da5d1c85136546437cf2451937725570ad79754ef2192ad18c3c8`
- workflow conclusion: `success`
- evidence status: `WRITE_PASS`
- rollback ejecutado: `false`

## Baseline y post-write verificados

```txt
ANTES
clientes: 414
aseguradoras: 26
asesores: 7
polizas: 0
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0

DESPUES
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

## Escrituras exactas

```txt
clientes: +16
aseguradoras restringidas: +4
polizas: +1373
auditoriaImportaciones: +1
recibos: 0
cartera: 0
cobros: 0
```

64 pólizas conservan calidad pendiente y 4 registros permanecen excluidos del paquete. El `targetIdDigest` post-validado coincide con el paquete congelado:

`bf3a21bbaae98cc5d2c14fd8068cc3b9c431c40ba3bdba96a0f4abe8aa701e2e`

## Regla contractual preservada

En Pólizas manda la vigencia. Una etiqueta fuente `Vencida` que represente condición de pago no degrada una póliza con vigencia contractual activa; se preserva `estadoFuenteOriginal` y la condición financiera queda diferida a Recibos/Cobros. `Terminada`, `Cancelada`, `Anulada` o `Reexpedida` mantienen su tratamiento contractual correspondiente.

## Seguridad y causa raíz

No hubo segundo intento ni parche reactivo. El gate canónico, el request inmutable, los hashes físico/lógico, los conteos baseline y los invariants post-write pasaron en la misma ejecución. No hubo rollback porque todos los invariants cerraron correctamente.

El write no materializó recibos, cartera, cobros ni finmovs.

## Siguiente acción exacta

Abrir `Vehículos` reutilizando el mismo patrón transversal de staging privado, hashes, IDs determinísticos, DRY_RUN/WRITE, relaciones fail-closed, calidad pendiente y rollback. La fuente histórica 2017–30/07/2026 ya fue recibida; no se solicitará nuevamente. Solo se pedirá un delta posterior si existe cuando corresponda.
